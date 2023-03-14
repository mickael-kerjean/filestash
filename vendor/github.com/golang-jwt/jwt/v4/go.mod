module github.com/golang-jwt/jwt/v4

go 1.16

retract (
    v4.4.0 // Contains a backwards incompatible change to the Claims interface.
)
