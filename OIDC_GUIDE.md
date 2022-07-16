# OpenID authentication middleware

## Configuring

* `OpenID URL` - Set to your base OpenID endpoint.
* `Client ID/Client Secret` - The client ID and secret of your Oauth2 client. 
* `Scopes` - Additional scopes to request, the scope openid is always requested.
* `Extra claims` - Extra claims to verify before granting access 

### Extra claims
Extra claims enables basic presence verification of claims in the ID token. Each claim is an equivalence check, and multiple claims are separated by whitespace. Nested JSON objects are accessed with dot-notation.

For key-value pairs where the value is a single entry, the claim is checked with strict equivalence.
Where the value is an array, the claim is verified to be part of the array.
All claims must be fulfilled for access to be granted.

This can for example be used to verify role or group membership before granting access.

**Example**

Example ID token

    {
      "iss": "http://my-oidc-provider.example",
      "sub": "123456",
      "aud": "my_client_id",
      "exp": 1311281970,
      "iat": 1311280970,
      "name": "Jane Doe",
      "given_name": "Jane",
      "family_name": "Doe",
      "preferred_username": "jane",
      "email": "janedoe@example.com",
      "email_verified": "true",
      "roles": [
        "filestash",
        "other-app"
      ]
    }

To verify that the user as a verified email and have been assigned the role `filestash` the following claim can be used.

    roles=filestash email_verified=true

# Usage of ID token claims with storage backends attribute mapping 

The following claims are available for use with the storage backends `preferred_username`, `email`, `locale`.
To use the claims, you must configure an attribute mapping.

For example to assign a sub-path of an S3 bucket to a user configure the S3 Path parameter of the bucket attribute mapping as follows

    my-shared-bucket/{{ index . "preferred_username" }}/

With the example ID token above the user could be assigned the path `my-shared-bucket/jane/`.