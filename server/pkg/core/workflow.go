package core

type ITrigger interface {
	Manifest() WorkflowSpecs
	Init() (chan ITriggerEvent, error)
}

type IAction interface {
	Manifest() WorkflowSpecs
	Execute(params map[string]string, input map[string]string) (map[string]string, error)
}

type ITriggerEvent interface {
	WorkflowID() string
	Input() map[string]string
}

type WorkflowSpecs struct {
	Name     string `json:"name"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Icon     string `json:"icon"`
	Specs    Form   `json:"specs"`
	Order    int    `json:"-"`
}
