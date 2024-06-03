import { defineConfig } from "vitest/config";

export default defineConfig(({ comand, mode }) => {
    return {
        plugins: [],
        test: {
            global: true,
            environment: "jsdom",
            setupFiles: ["./test/setup.js"],
        },
        coverage: {
            reporter: ["text", "html"],
            exclude: [
                "./public/assets/lib/vendor/**"
            ],
        }
    };
});
