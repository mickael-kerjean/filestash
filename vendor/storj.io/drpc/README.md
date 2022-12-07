# [![DRPC](logo.png)](https://storj.github.io/drpc/)

A drop-in, lightweight gRPC replacement.

[![Go Report Card](https://goreportcard.com/badge/storj.io/drpc)](https://goreportcard.com/report/storj.io/drpc)
[![Go Doc](https://img.shields.io/badge/godoc-reference-blue.svg?style=flat-square)](https://pkg.go.dev/storj.io/drpc)
![Beta](https://img.shields.io/badge/version-beta-green.svg)
[![Zulip Chat](https://img.shields.io/badge/zulip-join_chat-brightgreen.svg)](https://drpc.zulipchat.com)

## Links

 * [DRPC website](https://storj.github.io/drpc/)
 * [Examples](https://github.com/storj/drpc/tree/main/examples)
 * [Quickstart documentation](https://storj.github.io/drpc/docs.html)
 * [Launch blog post](https://www.storj.io/blog/introducing-drpc-our-replacement-for-grpc)

## Highlights

* Simple, at just a few thousand [lines of code](#lines-of-code).
* [Small dependencies](./blob/main/go.mod). Only 3 requirements in go.mod, and 9 lines of `go mod graph`!
* Compatible. Works for many gRPC use-cases as-is!
* [Fast](#benchmarks). DRPC has a lightning quick [wire format](https://github.com/storj/drpc/wiki/Docs:-Wire-protocol).
* [Extensible](#external-packages). DRPC is transport agnostic, supports middleware, and is designed around interfaces.
* Battle Tested. Already used in production for years across tens of thousands of servers.

## External Packages

 * [go.bryk.io/pkg/net/drpc](https://pkg.go.dev/go.bryk.io/pkg/net/drpc)
    - Simplified TLS setup (for client and server)
    - Server middleware, including basic components for logging, token-based auth, rate limit, panic recovery, etc
    - Client middleware, including basic components for logging, custom metadata, panic recovery, etc
    - Bi-directional streaming support over upgraded HTTP(S) connections using WebSockets
    - Concurrent RPCs via connection pool

 * Open an issue or join the [Zulip chat](https://drpc.zulipchat.com) if you'd like to be featured here.

## Other Languages

DRPC can be made compatible with RPC clients generated from other languages. For example, [Twirp](https://github.com/twitchtv/twirp) clients and [grpc-web](https://github.com/grpc/grpc-web/) clients can be used against the [drpchttp](https://pkg.go.dev/storj.io/drpc/drpchttp) package.

Native implementations can have some advantages, and so some bindings for other languages are in progress, all in various states of completeness. Join the [Zulip chat](https://drpc.zulipchat.com) if you want more information or to help out with any!

| Language | Repository                          | Status     |
|----------|-------------------------------------|------------|
| C++      | https://github.com/storj/drpc-cpp   | Incomplete |
| Rust     | https://github.com/zeebo/drpc-rs    | Incomplete |
| Node     | https://github.com/mjpitz/drpc-node | Incomplete |

## Licensing

DRPC is licensed under the MIT/expat license. See the LICENSE file for more.

---

## Benchmarks

These microbenchmarks attempt to provide a comparison and come with some caveats. First, it does not send data over a network connection which is expected to be the bottleneck almost all of the time. Second, no attempt was made to do the benchmarks in a controlled environment (CPU scaling disabled, noiseless, etc.). Third, no tuning was done to ensure they're both performing optimally, so there is an inherent advantage for DRPC because the author is familiar with how it works.

<table>
    <tr>
        <td rowspan=2>Measure</td>
        <td rowspan=2>Benchmark</td><td rowspan=2></td>
        <td colspan=3>Small</td><td rowspan=2></td>
        <td colspan=3>Medium</td><td rowspan=2></td>
        <td colspan=3>Large</td>
    </tr>
    <tr>
        <td>gRPC</td><td>DRPC</td><td>delta</td>
        <td>gRPC</td><td>DRPC</td><td>delta</td>
        <td>gRPC</td><td>DRPC</td><td>delta</td>
    </tr>
    <tr><td colspan=14></td></tr>
    <tr>
        <td rowspan=4>time/op</td>
        <td>Unitary</td><td rowspan=4></td>
        <td>30.2µs</td><td>8.6µs</td><td>-71.60%</td><td rowspan=4></td>
        <td>38.0µs</td><td>11.1µs</td><td>-70.88%</td><td rowspan=4></td>
        <td>1.33ms</td><td>0.63ms</td><td>-52.30%</td>
    </tr>
    <tr>
        <td>Input Stream</td>
        <td>878ns</td><td>759ns</td><td>-13.54%</td>
        <td>2.85µs</td><td>2.00µs</td><td>-29.69%</td>
        <td>508µs</td><td>249µs</td><td>-51.08%</td>
    </tr>
    <tr>
        <td>Output Stream</td>
        <td>862ns</td><td>757ns</td><td>-12.18%</td>
        <td>2.76µs</td><td>1.99µs</td><td>-27.92%</td>
        <td>487µs</td><td>239µs</td><td>-50.94%</td>
    </tr>
    <tr>
        <td>Bidir Stream</td>
        <td>9.81µs</td><td>3.30µs</td><td>-66.38%</td>
        <td>14.8µs</td><td>4.9µs</td><td>-66.69%</td>
        <td>1.31ms</td><td>0.55ms</td><td>-58.41%</td>
    </tr>
    <tr><td colspan=14></td></tr>
    <tr>
        <td rowspan=4>speed</td>
        <td>Unitary</td><td rowspan=4></td>
        <td>70.0kB/s</td><td>230.0kB/s</td><td>+228.57%</td><td rowspan=4></td>
        <td>54.0MB/s</td><td>185.3MB/s</td><td>+243.44%</td><td rowspan=4></td>
        <td>791MB/s</td><td>1658MB/s</td><td>+109.62%</td>
    </tr>
    <tr>
        <td>Input Stream</td>
        <td>2.29MB/s</td><td>2.64MB/s</td><td>+15.37%</td>
        <td>721MB/s</td><td>1026MB/s</td><td>+42.21%</td>
        <td>2.06GB/s</td><td>4.22GB/s</td><td>+104.32%</td>
    </tr>
    <tr>
        <td>Output Stream</td>
        <td>2.32MB/s</td><td>2.64MB/s</td><td>+13.67%</td>
        <td>743MB/s</td><td>1031MB/s</td><td>+38.74%</td>
        <td>2.15GB/s</td><td>4.39GB/s</td><td>+103.75%</td>
    </tr>
    <tr>
        <td>Bidir Stream</td>
        <td>200kB/s</td><td>604kB/s</td><td>+201.87%</td>
        <td>138MB/s</td><td>415MB/s</td><td>+200.20%</td>
        <td>799MB/s</td><td>1920MB/s</td><td>+140.44%</td>
    </tr>
    <tr><td colspan=14></td></tr>
    <tr>
        <td rowspan=4>mem/op</td>
        <td>Unitary</td><td rowspan=4></td>
        <td>8.37kB</td><td>1.29kB</td><td>-84.59%</td><td rowspan=4></td>
        <td>21.8kB</td><td>7.7kB</td><td>-64.81%</td><td rowspan=4></td>
        <td>6.50MB</td><td>3.16MB</td><td>-51.38%</td>
    </tr>
    <tr>
        <td>Input Stream</td>
        <td>399B</td><td>80B</td><td>-79.96%</td>
        <td>7.09kB</td><td>2.13kB</td><td>-69.97%</td>
        <td>3.20MB</td><td>1.05MB</td><td>-67.16%</td>
    </tr>
    <tr>
        <td>Output Stream</td>
        <td>309B</td><td>80B</td><td>-74.13%</td>
        <td>6.98kB</td><td>2.13kB</td><td>-69.53%</td>
        <td>3.20MB</td><td>1.05MB</td><td>-67.17%</td>
    </tr>
    <tr>
        <td>Bidir Stream</td>
        <td>1.02kB</td><td>0.24kB</td><td>-76.40%</td>
        <td>14.4kB</td><td>4.3kB</td><td>-69.99%</td>
        <td>6.52MB</td><td>2.10MB</td><td>-67.74%</td>
    </tr>
    <tr><td colspan=14></td></tr>
    <tr>
        <td rowspan=4>allocs/op</td>
        <td>Unitary</td><td rowspan=4></td>
        <td>169</td><td>7</td><td>-95.86%</td><td rowspan=4></td>
        <td>171</td><td>9</td><td>-94.74%</td><td rowspan=4></td>
        <td>403</td><td>9</td><td>-97.76%</td>
    </tr>
    <tr>
        <td>Input Stream</td>
        <td>11</td><td>1</td><td>-90.91%</td>
        <td>12</td><td>2</td><td>-83.33%</td>
        <td>121</td><td>2</td><td>-98.35%</td>
    </tr>
    <tr>
        <td>Output Stream</td>
        <td>9</td><td>1</td><td>-88.89%</td>
        <td>10</td><td>2</td><td>-80.00%</td>
        <td>117</td><td>2</td><td>-98.29%</td>
    </tr>
    <tr>
        <td>Bidir Stream</td>
        <td>41</td><td>3</td><td>-92.68%</td>
        <td>44</td><td>5</td><td>-88.64%</td>
        <td>272</td><td>5</td><td>-98.16%</td>
    </tr>
</table>

## Lines of code

| Package                              | Lines    |
| ---                                  | ---      |
| storj.io/drpc/drpchttp               | 475      |
| storj.io/drpc/cmd/protoc-gen-go-drpc | 418      |
| storj.io/drpc/drpcstream             | 390      |
| storj.io/drpc/drpcwire               | 332      |
| storj.io/drpc/drpcmanager            | 300      |
| storj.io/drpc/drpcmigrate            | 237      |
| storj.io/drpc/drpcsignal             | 133      |
| storj.io/drpc/drpcconn               | 116      |
| storj.io/drpc/drpcmetadata           | 115      |
| storj.io/drpc/drpcmux                | 95       |
| storj.io/drpc/drpcserver             | 76       |
| storj.io/drpc/drpccache              | 54       |
| storj.io/drpc                        | 47       |
| storj.io/drpc/drpcerr                | 42       |
| storj.io/drpc/drpcctx                | 37       |
| storj.io/drpc/drpcdebug              | 22       |
| storj.io/drpc/drpcenc                | 15       |
| storj.io/drpc/internal/drpcopts      | 11       |
| **Total**                            | **2915** |
