# Background of Backend

| Key             | comment                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Node.js         |                                                                                                              |
| API Management  | Express.js                                                                                                   |
| Database        | MySQL (MariaDb)                                                                                              |
| File Upload     | multer                                                                                                       |
| authorization   | JWT: create a jwt token and then verify user's permission                                                    |
| prevent csrf    | csurf: use double-submit cookie to prevent csrf. It will verify the csrf tokens in cookie and request header |
| JWT_SECRET      | CORS origin: https://secure.s16.ierg4210.ie.cuhk.edu.hk only                                                 |
| form validation | JOI: prevent XSS with comprehensive backend validation                                                       |

## config.env (under root directory directly)

| key         |
| ----------- |
| SERVER_PORT |
| DB_HOST     |
| DB_USER     |
| DB_PASSWORD |
| DB_PORT     |
| DB_DATABASE |
| JWT_SECRET  |
| CORS_ORIGIN |
| MERCHANT    |

## How to Run the project's backend

### Install Node.js (if not yet install)

Download from https://nodejs.org/en/. Version is 18.xx.x LTS (left button)

### `npm install`

Open terminal such as Powershell. Use `cd` command to arrive this folder (ierg4210_server). After reaching, please run `npm install` command to install all the dependencies.

### `npm install nodemon pm2 -g` (Optional)

For Local testing or design, recommend to install nodemon
For deployment in aws ec2, recommend to install pm2

### Some methods to turn on the server

1. `node index.js` - not recommend (not powerful enough)
2. `nodemon index.js` - for local testing
3. `pm2 index.js` - for deployment in aws ec2

## Remainder of backend

After turning on server in local, you have to turn on frontend to view the page. You can read README.md in ierg4210 folder for learning how to turn on frontend.
