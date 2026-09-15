package journal

import (
	"container/ring"
)

 type Ring[T IObservation] struct {
	node *ring.Ring
}

func NewRing[T IObservation](size int, initial T) Ring[T] {
	r := ring.New(size)
	for i := 0; i < size; i++ {
		r.Value = initial
		r = r.Next()
	}
	return Ring[T]{node: r}
}

func (r Ring[T]) Get() T {
	return r.node.Value.(T)
}

func (r Ring[T]) Set(value T) {
	r.node.Value = value
}

func (r Ring[T]) Next() Ring[T] {
	return Ring[T]{node: r.node.Next()}
}

func (r Ring[T]) Prev() Ring[T] {
	return Ring[T]{node: r.node.Prev()}
}

func (r Ring[T]) Len() int {
	return r.node.Len()
}
