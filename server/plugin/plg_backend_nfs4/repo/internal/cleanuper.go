package internal

type cleanuper struct {
	cleanupErr func() error
	cleanup    func()
}

func NewCleanupErr(cl func() error) *cleanuper {
	return &cleanuper{cleanupErr: cl}
}

func NewCleanup(cl func()) *cleanuper {
	return &cleanuper{cleanup: cl}
}

func (c *cleanuper) Disarm() {
	c.cleanupErr = nil
	c.cleanup = nil
}

func (c *cleanuper) Cleanup() {
	if c.cleanupErr != nil {
		_ = c.cleanupErr()
	}

	if c.cleanup != nil {
		c.cleanup()
	}
}

