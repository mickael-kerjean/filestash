import { createElement } from "../../lib/skeleton/index.js";
import { loadCSS } from "../../helpers/loader.js";

import AdminHOC from "./decorator.js";
import ctrlList from "./ctrl_workflow_list.js";
import ctrlDetails from "./ctrl_workflow_details.js";

const workflows = [
    {
        id: "dummy",
        name: "My First Workflow",
        published: false,
        trigger: { name: "user" },
        actions: [
            {
                name: "tools/debug",
            },
            {
                name: "notify/email",
            }
        ],
    },
    {
        id: "uuid0",
        name: "Detection de fichier d'inbox",
        published: true,
        lastEdited: "2 days ago",
        trigger: { name: "watch" },
        actions: [
            {
                name: "run/program",
            },
            {
                name: "notify/email",
            },
        ],
    },
    {
        id: "uuid1",
        name: "Notify team when file is moved",
        published: true,
        lastEdited: "2 days ago",
        history: [],
        trigger: { name: "operation" },
        actions: [
            {
                name: "notify/email",
            },
        ]
    },
    {
        id: "uuid2",
        name: "Any change to the contract folder",
        published: true,
        history: [],
        trigger: { name: "operation", values: {} },
        actions: [
            {
                name: "notify/email",
                // values: {} // TODO
            },
        ]
    },
];

const triggers = [
    {
        name: "schedule",
        title: "On a Schedule",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320zM64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z"></path></svg>`,
        specs: {
            "start": {
                name: "test",
                type: "datetime",
            },
            "frequency": {
                type: "select",
                options: ["hourly", "weekly", "monthly", "yearly"],
            },
        },
    },
    {
        name: "user",
        title: "When a User Creates a Request",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M240 192C240 147.8 275.8 112 320 112C364.2 112 400 147.8 400 192C400 236.2 364.2 272 320 272C275.8 272 240 236.2 240 192zM448 192C448 121.3 390.7 64 320 64C249.3 64 192 121.3 192 192C192 262.7 249.3 320 320 320C390.7 320 448 262.7 448 192zM144 544C144 473.3 201.3 416 272 416L368 416C438.7 416 496 473.3 496 544L496 552C496 565.3 506.7 576 520 576C533.3 576 544 565.3 544 552L544 544C544 446.8 465.2 368 368 368L272 368C174.8 368 96 446.8 96 544L96 552C96 565.3 106.7 576 120 576C133.3 576 144 565.3 144 552L144 544z"/></svg>`,
        specs: {
            name: { type: "text" },
            form: { type: "text", placeholder: "Optional form user should submit" },
            visibility: { type: "text" },
        },
    },
    {
        name: "operation",
        title: "When a File Action Happens",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M192 64C156.7 64 128 92.7 128 128L128 368L310.1 368L279.1 337C269.7 327.6 269.7 312.4 279.1 303.1C288.5 293.8 303.7 293.7 313 303.1L385 375.1C394.4 384.5 394.4 399.7 385 409L313 481C303.6 490.4 288.4 490.4 279.1 481C269.8 471.6 269.7 456.4 279.1 447.1L310.1 416.1L128 416.1L128 512.1C128 547.4 156.7 576.1 192 576.1L448 576.1C483.3 576.1 512 547.4 512 512.1L512 234.6C512 217.6 505.3 201.3 493.3 189.3L386.7 82.7C374.7 70.7 358.5 64 341.5 64L192 64zM453.5 240L360 240C346.7 240 336 229.3 336 216L336 122.5L453.5 240z"/></svg>`,
        specs: {
            event: {
                type: "text",
                datalist: ["ls", "cat", "mkdir", "mv", "rm", "touch"],
                multi: true,
            },
            path: {
                type: "text",
            },
        },
    },
    {
        name: "watch",
        title: "When the Filesystem Changes",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M128 64C92.7 64 64 92.7 64 128L64 512C64 547.3 92.7 576 128 576L308 576C285.3 544.5 272 505.8 272 464C272 363.4 349.4 280.8 448 272.7L448 234.6C448 217.6 441.3 201.3 429.3 189.3L322.7 82.7C310.7 70.7 294.5 64 277.5 64L128 64zM389.5 240L296 240C282.7 240 272 229.3 272 216L272 122.5L389.5 240zM464 608C543.5 608 608 543.5 608 464C608 384.5 543.5 320 464 320C384.5 320 320 384.5 320 464C320 543.5 384.5 608 464 608zM480 400L480 448L528 448C536.8 448 544 455.2 544 464C544 472.8 536.8 480 528 480L480 480L480 528C480 536.8 472.8 544 464 544C455.2 544 448 536.8 448 528L448 480L400 480C391.2 480 384 472.8 384 464C384 455.2 391.2 448 400 448L448 448L448 400C448 391.2 455.2 384 464 384C472.8 384 480 391.2 480 400z"/></svg>`,
        specs: {
            token: {
                type: "text",
            },
            path: {
                type: "text",
            },
        },
    },
    {
        name: "webhook",
        title: "From a webhook",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M392.8 65.2C375.8 60.3 358.1 70.2 353.2 87.2L225.2 535.2C220.3 552.2 230.2 569.9 247.2 574.8C264.2 579.7 281.9 569.8 286.8 552.8L414.8 104.8C419.7 87.8 409.8 70.1 392.8 65.2zM457.4 201.3C444.9 213.8 444.9 234.1 457.4 246.6L530.8 320L457.4 393.4C444.9 405.9 444.9 426.2 457.4 438.7C469.9 451.2 490.2 451.2 502.7 438.7L598.7 342.7C611.2 330.2 611.2 309.9 598.7 297.4L502.7 201.4C490.2 188.9 469.9 188.9 457.4 201.4zM182.7 201.3C170.2 188.8 149.9 188.8 137.4 201.3L41.4 297.3C28.9 309.8 28.9 330.1 41.4 342.6L137.4 438.6C149.9 451.1 170.2 451.1 182.7 438.6C195.2 426.1 195.2 405.8 182.7 393.3L109.3 320L182.6 246.6C195.1 234.1 195.1 213.8 182.6 201.3z"/></svg>`,
        specs: {
            url: {
                type: "text",
                readonly: true,
                value: "http://example.com/workflow/webhook?id=generatedID",
            }
        },
    },
];

const actions = [
    {
        name: "run/program",
        title: "Execute Program",
        subtitle: "name",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160zM240 164C215.7 164 196 183.7 196 208L196 256C196 280.3 215.7 300 240 300L272 300C296.3 300 316 280.3 316 256L316 208C316 183.7 296.3 164 272 164L240 164zM236 208C236 205.8 237.8 204 240 204L272 204C274.2 204 276 205.8 276 208L276 256C276 258.2 274.2 260 272 260L240 260C237.8 260 236 258.2 236 256L236 208zM376 164C365 164 356 173 356 184C356 193.7 362.9 201.7 372 203.6L372 280C372 291 381 300 392 300C403 300 412 291 412 280L412 184C412 173 403 164 392 164L376 164zM228 360C228 369.7 234.9 377.7 244 379.6L244 456C244 467 253 476 264 476C275 476 284 467 284 456L284 360C284 349 275 340 264 340L248 340C237 340 228 349 228 360zM324 384L324 432C324 456.3 343.7 476 368 476L400 476C424.3 476 444 456.3 444 432L444 384C444 359.7 424.3 340 400 340L368 340C343.7 340 324 359.7 324 384zM368 380L400 380C402.2 380 404 381.8 404 384L404 432C404 434.2 402.2 436 400 436L368 436C365.8 436 364 434.2 364 432L364 384C364 381.8 365.8 380 368 380z"></path></svg>`,
        specs: {
            name: {
                type: "select",
                options: ["ocr", "duplicate", "expiry", "sign"],
            }
        },
    },
    {
        name: "run/api",
        title: "Make API Call",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160zM240 164C215.7 164 196 183.7 196 208L196 256C196 280.3 215.7 300 240 300L272 300C296.3 300 316 280.3 316 256L316 208C316 183.7 296.3 164 272 164L240 164zM236 208C236 205.8 237.8 204 240 204L272 204C274.2 204 276 205.8 276 208L276 256C276 258.2 274.2 260 272 260L240 260C237.8 260 236 258.2 236 256L236 208zM376 164C365 164 356 173 356 184C356 193.7 362.9 201.7 372 203.6L372 280C372 291 381 300 392 300C403 300 412 291 412 280L412 184C412 173 403 164 392 164L376 164zM228 360C228 369.7 234.9 377.7 244 379.6L244 456C244 467 253 476 264 476C275 476 284 467 284 456L284 360C284 349 275 340 264 340L248 340C237 340 228 349 228 360zM324 384L324 432C324 456.3 343.7 476 368 476L400 476C424.3 476 444 456.3 444 432L444 384C444 359.7 424.3 340 400 340L368 340C343.7 340 324 359.7 324 384zM368 380L400 380C402.2 380 404 381.8 404 384L404 432C404 434.2 402.2 436 400 436L368 436C365.8 436 364 434.2 364 432L364 384C364 381.8 365.8 380 368 380z"></path></svg>`,
        specs: {
            url: {
                type: "text",
            },
            method: {
                options: ["POST", "PUT", "GET"],
            },
            headers: {
                type: "long_text",
            },
            body: {
                type: "long_text",
            },
        },
    },
    {
        name: "notify/email",
        title: "Notify",
        subtitle: "email",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M112 128C85.5 128 64 149.5 64 176C64 191.1 71.1 205.3 83.2 214.4L291.2 370.4C308.3 383.2 331.7 383.2 348.8 370.4L556.8 214.4C568.9 205.3 576 191.1 576 176C576 149.5 554.5 128 528 128L112 128zM64 260L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 260L377.6 408.8C343.5 434.4 296.5 434.4 262.4 408.8L64 260z"></path></svg>`,
        specs: {
            email: {
                type: "text",
            },
            message: {
                type: "long_text",
            }
        },
    },
    {
        name: "approval/email",
        title: "Approval",
        subtitle: "email",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M112 128C85.5 128 64 149.5 64 176C64 191.1 71.1 205.3 83.2 214.4L291.2 370.4C308.3 383.2 331.7 383.2 348.8 370.4L556.8 214.4C568.9 205.3 576 191.1 576 176C576 149.5 554.5 128 528 128L112 128zM64 260L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 260L377.6 408.8C343.5 434.4 296.5 434.4 262.4 408.8L64 260z"></path></svg>`,
        specs: {
            email: {
                type: "text",
            },
            message: {
                type: "long_text",
            },
        },
    },
    {
        name: "tools/debug",
        title: "Debug",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M102.8 57.3C108.2 51.9 116.6 51.1 123 55.3L241.9 134.5C250.8 140.4 256.1 150.4 256.1 161.1L256.1 210.7L346.9 301.5C380.2 286.5 420.8 292.6 448.1 320L574.2 446.1C592.9 464.8 592.9 495.2 574.2 514L514.1 574.1C495.4 592.8 465 592.8 446.2 574.1L320.1 448C292.7 420.6 286.6 380.1 301.6 346.8L210.8 256L161.2 256C150.5 256 140.5 250.7 134.6 241.8L55.4 122.9C51.2 116.6 52 108.1 57.4 102.7L102.8 57.3zM247.8 360.8C241.5 397.7 250.1 436.7 274 468L179.1 563C151 591.1 105.4 591.1 77.3 563C49.2 534.9 49.2 489.3 77.3 461.2L212.7 325.7L247.9 360.8zM416.1 64C436.2 64 455.5 67.7 473.2 74.5C483.2 78.3 485 91 477.5 98.6L420.8 155.3C417.8 158.3 416.1 162.4 416.1 166.6L416.1 208C416.1 216.8 423.3 224 432.1 224L473.5 224C477.7 224 481.8 222.3 484.8 219.3L541.5 162.6C549.1 155.1 561.8 156.9 565.6 166.9C572.4 184.6 576.1 203.9 576.1 224C576.1 267.2 558.9 306.3 531.1 335.1L482 286C448.9 253 403.5 240.3 360.9 247.6L304.1 190.8L304.1 161.1L303.9 156.1C303.1 143.7 299.5 131.8 293.4 121.2C322.8 86.2 366.8 64 416.1 63.9z"/></svg>`,
        specs: {},
    },
    {
        name: "tools/map",
        title: "Map",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M102.8 57.3C108.2 51.9 116.6 51.1 123 55.3L241.9 134.5C250.8 140.4 256.1 150.4 256.1 161.1L256.1 210.7L346.9 301.5C380.2 286.5 420.8 292.6 448.1 320L574.2 446.1C592.9 464.8 592.9 495.2 574.2 514L514.1 574.1C495.4 592.8 465 592.8 446.2 574.1L320.1 448C292.7 420.6 286.6 380.1 301.6 346.8L210.8 256L161.2 256C150.5 256 140.5 250.7 134.6 241.8L55.4 122.9C51.2 116.6 52 108.1 57.4 102.7L102.8 57.3zM247.8 360.8C241.5 397.7 250.1 436.7 274 468L179.1 563C151 591.1 105.4 591.1 77.3 563C49.2 534.9 49.2 489.3 77.3 461.2L212.7 325.7L247.9 360.8zM416.1 64C436.2 64 455.5 67.7 473.2 74.5C483.2 78.3 485 91 477.5 98.6L420.8 155.3C417.8 158.3 416.1 162.4 416.1 166.6L416.1 208C416.1 216.8 423.3 224 432.1 224L473.5 224C477.7 224 481.8 222.3 484.8 219.3L541.5 162.6C549.1 155.1 561.8 156.9 565.6 166.9C572.4 184.6 576.1 203.9 576.1 224C576.1 267.2 558.9 306.3 531.1 335.1L482 286C448.9 253 403.5 240.3 360.9 247.6L304.1 190.8L304.1 161.1L303.9 156.1C303.1 143.7 299.5 131.8 293.4 121.2C322.8 86.2 366.8 64 416.1 63.9z"/></svg>`,
        specs: {
            transform: {
                type: "long_text",
            }
        },
    }
    // TODO: expand macros
];

const macros = [
    {
        name: "files/mv",
        specs: [
            { name: "from", type: "text" },
            { name: "to", type: "text" },
        ],
        run: [
            {
                name: "run/api",
                values: [
                    { name: "url", value: "{{ .endpoint }}/api/files/mv?from={{ .from }}&to={{ .to }}" },
                    { name: "method", value: "POST" },
                    { name: "headers", value: "Authorization: Bearer {{ .authorization }}" },
                ]
            },
        ],
    },
    // {
    //     name: "metadata/add",
    // }
]

export default AdminHOC(async function(render) {
    await loadCSS(import.meta.url, "./ctrl_workflow.css");
    render(createElement("<component-loader inlined></component-loader>"));

    const specs = getSpecs();
    if (specs) ctrlDetails(render, { workflow: specs, triggers, actions });
    else {
        await new Promise((done) => setTimeout(() => done(), 100));
        ctrlList(render, { workflows, triggers, actions });
    }
});

function getSpecs() {
    const GET = new URLSearchParams(location.search)
    try {
        return JSON.parse(atob(GET.get("specs")));
    } catch (err ) {
        return null;
    }
}
