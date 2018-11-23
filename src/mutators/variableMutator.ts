import * as tsutils from "tsutils";
import * as ts from "typescript";

import { IMutation } from "automutate";
import { FileMutationsRequest } from "../runtime/findMutationsInFile";
import { Mutator } from "../runtime/mutator";
import { createTypeAdditionMutation, createTypeCreationMutation } from "../shared/mutations";
import { nodeContainsType } from "../shared/nodeTypes";

export const variableMutator: Mutator<ts.VariableDeclaration> = {
    metadata: {
        selector: ts.SyntaxKind.VariableDeclaration,
    },
    run: (node: ts.VariableDeclaration, request: FileMutationsRequest): IMutation | undefined => {
        // Collect the type initially declared by or inferred on the variable
        const declaredType = request.services.program.getTypeChecker().getTypeAtLocation(node);

        // Collect types later assigned to the variable
        const assignedTypes = collectVariableAssignedTypes(node, request);

        // If the variable already has a declared type, add assigned types to it if necessary
        if (nodeContainsType(node)) {
            return createTypeAdditionMutation(node.type, declaredType, assignedTypes, request.options.typeAliases);
        }

        // Since the node doesn't have its own type, give it one if necessary
        return createTypeCreationMutation(node.name.end, declaredType, assignedTypes, request.options.typeAliases);
    },
};

/**
 * Finds types later assigned to a variable declaration.
 *
 * @param node   Node to collect types from.
 * @param request   Metadata and settings to collect mutations in a file.
 * @returns Types assigned to the node in the file.
 */
const collectVariableAssignedTypes = (node: ts.VariableDeclaration, request: FileMutationsRequest): ReadonlyArray<ts.Type> => {
    const assignedTypes: ts.Type[] = [];

    // If the variable has an initial value, consider that an assignment
    if (node.initializer !== undefined) {
        assignedTypes.push(request.services.program.getTypeChecker().getTypeAtLocation(node.initializer));
    }

    // If the variable is anonymous or marked as readonly, don't bother checking for more types
    if (!ts.isIdentifier(node.name) || tsutils.isModifierFlagSet(node, ts.ModifierFlags.Readonly)) {
        return assignedTypes;
    }

    // Collect all places in the file where the variable is later referenced
    const variableInfo = request.fileInfoCache.getVariableUsage().get(node.name);
    if (variableInfo === undefined) {
        return assignedTypes;
    }

    for (const use of variableInfo.uses) {
        const useIdentifier = use.location;
        const useExpression = useIdentifier.parent;

        // We care about binary expressions that assign a type to the variable
        if (ts.isBinaryExpression(useExpression) && useExpression.left === useIdentifier) {
            // Grab the new type being assigned to the node
            assignedTypes.push(request.services.program.getTypeChecker().getTypeAtLocation(useExpression.right));
        }
    }

    return assignedTypes;
};