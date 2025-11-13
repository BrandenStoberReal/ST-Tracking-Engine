export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    testEnvironmentOptions: {
        url: 'http://localhost'
    },
    collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.test.{js,jsx,ts,tsx}',
        '!src/**/*.spec.{js,jsx,ts,tsx}',
        '!**/node_modules/**',
        '!**/vendor/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 0.5,
            functions: 1,
            lines: 1,
            statements: 1
        }
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    moduleNameMapper: {
        '\.(css|less|scss|sass)$': 'identity-obj-proxy'
    },
    testMatch: [
        '<rootDir>/tests/**/*.(test|spec).{js,jsx,ts,tsx}',
        '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}'
    ],
    transform: {
        '^.+\.(ts|tsx)?$': 'ts-jest',
        '^.+\.(js|jsx)$': 'babel-jest'
    },
    transformIgnorePatterns: [
        '/node_modules/(?!(jquery)/)'
    ]
};
