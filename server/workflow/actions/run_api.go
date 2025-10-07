package actions

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.WorkflowAction(&RunApi{})
}

type RunApi struct{}

func (this *RunApi) Manifest() WorkflowSpecs {
	return WorkflowSpecs{
		Name:  "run/api",
		Title: "Make API Call",
		Icon:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160zM240 164C215.7 164 196 183.7 196 208L196 256C196 280.3 215.7 300 240 300L272 300C296.3 300 316 280.3 316 256L316 208C316 183.7 296.3 164 272 164L240 164zM236 208C236 205.8 237.8 204 240 204L272 204C274.2 204 276 205.8 276 208L276 256C276 258.2 274.2 260 272 260L240 260C237.8 260 236 258.2 236 256L236 208zM376 164C365 164 356 173 356 184C356 193.7 362.9 201.7 372 203.6L372 280C372 291 381 300 392 300C403 300 412 291 412 280L412 184C412 173 403 164 392 164L376 164zM228 360C228 369.7 234.9 377.7 244 379.6L244 456C244 467 253 476 264 476C275 476 284 467 284 456L284 360C284 349 275 340 264 340L248 340C237 340 228 349 228 360zM324 384L324 432C324 456.3 343.7 476 368 476L400 476C424.3 476 444 456.3 444 432L444 384C444 359.7 424.3 340 400 340L368 340C343.7 340 324 359.7 324 384zM368 380L400 380C402.2 380 404 381.8 404 384L404 432C404 434.2 402.2 436 400 436L368 436C365.8 436 364 434.2 364 432L364 384C364 381.8 365.8 380 368 380z"></path></svg>`,
		Specs: Form{
			Elmnts: []FormElement{
				{
					Name: "url",
					Type: "text",
				},
				{
					Name: "method",
					Type: "select",
					Opts: []string{"POST", "PUT", "GET", "PATCH"},
				},
				{
					Name: "headers",
					Type: "long_text",
				},
				{
					Name: "body",
					Type: "long_text",
				},
			},
		},
	}
}

func (this *RunApi) Execute(params map[string]string, input map[string]string) (map[string]string, error) {
	req, err := http.NewRequest(params["method"], params["url"], bytes.NewBufferString(params["body"]))
	if err != nil {
		return input, err
	} else if params["headers"] != "" {
		for _, header := range strings.Split(params["headers"], "\n") {
			if parts := strings.SplitN(strings.TrimSpace(header), ":", 2); len(parts) == 2 {
				req.Header.Add(
					strings.TrimSpace(parts[0]),
					strings.TrimSpace(parts[1]),
				)
			}
		}
	}
	if params["body"] != "" && slices.Contains([]string{"POST", "PUT", "PATCH"}, params["method"]) && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := HTTP.Do(req)
	if err != nil {
		return input, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return input, NewError(fmt.Sprintf("received status code is %d", resp.StatusCode), resp.StatusCode)
	}
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return input, err
	}
	output := make(map[string]string)
	for k, v := range input {
		output[k] = v
	}
	output["http::status"] = string(resp.StatusCode)
	output["http::response"] = string(responseBody)
	return output, nil
}
