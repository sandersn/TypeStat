import { IMutation } from "automutate";
import * as ts from "typescript";

import { findNodeByStartingPosition } from "../../shared/nodes";
import { collectMutationsFromNodes } from "../collectMutationsFromNodes";
import { FileMutationsRequest, FileMutator } from "../fileMutator";

export const functionLikeMutator: FileMutator = (request: FileMutationsRequest): ReadonlyArray<IMutation> => {
    // This fixer is only relevant if removing unnecessary types
    if (!request.options.fixes.unnecessaryTypes) {
        return [];
    }

    const visitFunctionLike = (node: ts.FunctionLike) => {
        const typeChecker = request.services.program.getTypeChecker();

        // Record the declared parameter types of the node, (for now) ignoring the last if it's a rest parameter
        // That will be fixed in https://github.com/JoshuaKGoldberg/TypeStat/issues/27
        const parameterDeclaredTypes = node.parameters
            .filter((parameter) => parameter.dotDotDotToken === undefined)
            .map((parameter) => typeChecker.getTypeAtLocation(parameter));

        if (parameterDeclaredTypes.length === 0) {
            return undefined;
        }

        // For each parameter, we'll keep a list of types that are ever passed to it
        const parameterCalledTypes = parameterDeclaredTypes.map<Set<ts.Type>>(() => new Set());

        // Find all places the node is called
        const references = request.fileInfoCache.getNodeReferences(node);
        if (references === undefined) {
            return undefined;
        }

        for (const reference of references) {
            // Grab the source file containing the reference
            const referencingSourceFile = request.services.program.getSourceFile(reference.fileName);
            if (referencingSourceFile === undefined) {
                continue;
            }

            // If the reference isn't directly and predictably calling the function-like, bail out:
            // We don't want to try to predict method usage if passed around as a variable
            const identifier = findNodeByStartingPosition(referencingSourceFile, reference.textSpan.start);
            const callingExpression = getCallingExpressionOfIdentifier(identifier);
            if (callingExpression === undefined) {
                return undefined;
            }

            // Record the called type of each parameter in this calling expression
            for (let i = 0; i < Math.min(callingExpression.arguments.length, parameterDeclaredTypes.length); i += 1) {
                parameterCalledTypes[i].add(typeChecker.getTypeAtLocation(callingExpression.arguments[i]));
            }
        }
    };

    return collectMutationsFromNodes(request, ts.isFunctionLike, visitFunctionLike);
};

const getCallingExpressionOfIdentifier = (identifier: ts.Node): ts.CallExpression | undefined => {
    while (ts.isPropertyAccessExpression(identifier.parent)) {
        identifier = identifier.parent;
    }

    if (ts.isCallExpression(identifier.parent)) {
        return identifier.parent;
    }

    return undefined;
};
