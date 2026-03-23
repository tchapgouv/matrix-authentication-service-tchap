curl -X POST "https://matrix.agent.dinum.tchap.gouv.fr/_matrix/client/v3/login" \
-H "Content-Type: application/json" \
-d '{
    "type": "m.login.password",
    "password": "YAZtchblk12!",
    "identifier": {
        "type": "m.id.user",
        "user": "@olivier.delcroix-beta.gouv.fr1:agent.dinum.tchap.gouv.fr"
    }
}'