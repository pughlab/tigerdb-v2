import {GraphQLScalarType, Kind} from "graphql";
import GraphQLUpload from "graphql-upload/GraphQLUpload.mjs";

const emailRegex: RegExp =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

const DecimalScalar = new GraphQLScalarType<number>({
    name: "Decimal",
    description: "A custom scalar type for decimal numbers",
    serialize: (value) => Number.parseFloat(value as string),
    parseValue: (value) => Number.parseFloat(value as string),
    parseLiteral(ast) {
        if (ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
            return Number.parseFloat(ast.value);
        }
        throw new Error("Decimal can only parse float or int values");
    }
})

const EmailScalar = new GraphQLScalarType<string>({
    name: "Email",
    description: "A custom scalar type for email addresses",
    serialize: (value) => (value as string).toLowerCase(),
    parseValue(value) {
        if (typeof value !== "string" || !emailRegex.test(value)) {
            throw new Error("Invalid email address");
        }
        return value.toLowerCase();
    },
    parseLiteral(ast) {
        if (ast.kind !== Kind.STRING || !emailRegex.test(ast.value)) {
            throw new Error("Invalid email address");
        }
        return ast.value.toLowerCase();
    }
})

const resolvers = {
    Decimal: DecimalScalar,
    Email: EmailScalar,
    Upload: GraphQLUpload,
}

export default resolvers;