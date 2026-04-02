module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: {
                    target: "es2022",
                    module: "CommonJS",
                    esModuleInterop: true
                }
            },
        ],
    },
};
