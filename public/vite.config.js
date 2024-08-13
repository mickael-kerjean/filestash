import { defineConfig } from "vitest/config";

export default defineConfig(({ comand, mode }) => {
    return {
        plugins: [],
        test: {
            global: true,
            environment: "jsdom",
            setupFiles: ["./vite.setup.js"],
        }
    };
});
