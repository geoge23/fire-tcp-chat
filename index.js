const net = require('net')
const fs = require('fs')
const ascii = fs.readFileSync('./ssascii.txt')
const {v4: uuidv4} = require('uuid')
const mongoose = require('mongoose')
mongoose.connect('mongodb+srv://george:***REMOVED***@cluster0.od8lt.gcp.mongodb.net/chat', {useNewUrlParser: true, useUnifiedTopology: true})
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;
const chars = {
    cls: '\033[2J',
    red: '\u001b[31m',
    black: "\x1b[30m",
    yellowBg: "\x1b[43m",
    clear: "\x1b[0m",
    nl: '\n'
}
const UserSchema = new mongoose.model('user', {
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
})

const server = net.createServer()

const users = {};
const messages = []

server.on('connection', user => {
    user.id = uuidv4();
    users[user.id] = {
        id: user.id,
        status: 'auth'
    };
    console.log(user.id,users)
    user.write(chars.cls)
    user.write(ascii)
    user.write(`${chars.red}Welcome to the SheepStudios Server\n${chars.clear}Please authenticate with (username):(password)\nor create an account by typing signup\n`)

    user.on('data', async (d) => {
        const msg = Buffer.from(d).toString('utf-8')
        switch (msg) {
            case 'signup\n':
                users[user.id].status = 'signup'
                user.write(chars.cls)
                user.write(ascii)
                user.write('Let\'s make an account\nType in your username: ')
                break;
            default:
                break;
        }
        switch (users[user.id].status) {
            case 'auth':
                const [username, password] = msg.split(':')
                if (!username || !password || msg.split(':').length > 2) {
                    error(user, 'Your login is malformed. It should look like (username):(password)')
                    break;
                }
                let load = spinner(user, 'pulling your account')
                try {
                    const userDoc = await UserSchema.findOne({username})
                    console.log(userDoc)
                } catch (e) {
                    error(user, `An error, ${e}, has occurred`)
                }
                break;
            case 'signup':
                if (!users[user.id].isSettingPassword) {
                    users[user.id].username = msg.replace(/\n/g, "")
                    users[user.id].isSettingPassword = true;
                } else if (users[user.id].passwordSet) {
                    
                    const load = spinner(user, 'Setting up your account')
                    const pswd = msg.replace(/\n/g, "");
                    const password = bcrypt.hashSync(pswd, SALT_ROUNDS)
                    await new UserSchema({
                        username: users[user.id].username,
                        password
                    }).save()
                    console.log('user created')
                } else {
                    user.write('Okay, now set a password: ')
                    users[user.id].passwordSet = true;
                }
                break;
            default:
                break;
        }
    })
})

server.listen(420)

function spinner(user, text) {
    let spinner = ['-', '\\', '|', '/']
    let enumerator = 0;
    return setInterval(async () => {
        user.write(ascii)
        user.write(`${chars.yellowBg}${chars.black}${spinner[enumerator]} SSN>${chars.clear} ${text}`)
        await new Promise((res, rej) => {
            setTimeout(() => {
                user.write(chars.cls)
                res()
            }, 495)
        })
        enumerator++
        if (enumerator >= spinner.length) {
            enumerator = 0;
        }
    }, 500)
}

function error(user, text) {
    user.write(`${chars.red}${text}\n${chars.clear}`)
}