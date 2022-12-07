// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

// Package macaroon implements contextual caveats and authorization.
package macaroon

//go:generate protoc -I=../pb --lint_out=. --gogo_out=paths=source_relative,Mgoogle/protobuf/timestamp.proto=storj.io/common/pb:. -I=. types.proto
//go:generate goimports -local storj.io -w .
