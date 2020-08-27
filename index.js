require('dotenv').config()
const net = require('net')
const tls = require('tls')
const fs = require('fs')
const ascii = fs.readFileSync('./ascii.txt')
const {v4: uuidv4} = require('uuid')
const mongoose = require('mongoose')
mongoose.connect(process.env.CONNECTION_STRING, {useNewUrlParser: true, useUnifiedTopology: true})
const bcrypt = require('bcrypt');
const config = JSON.parse(fs.readFileSync('config.json'))

const SALT_ROUNDS = 10;
const chars = {
    cls: '\033[2J',
    red: '\u001b[31m',
    black: "\x1b[30m",
    blue: '\u001b[36m',
    yellowBg: "\x1b[43m",
    clear: "\x1b[0m",
    nl: '\n'
}
const UserSchema = new mongoose.model('user', {
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    admin: {
        type: Boolean,
        required: false
    }
})

if (!process.env.DISABLE_INSECURE) {
    const server = net.createServer(manageConnection)
    server.listen(process.env.PORT || 420)
}
if (process.env.ENABLE_TLS) {
    const tlsServer = tls.createServer({
        key: fs.readFileSync('./certs/privkey.pem'),
        cert: fs.readFileSync('./certs/cert.pem'),
        ca: fs.readFileSync('./certs/chain.pem')
    }, manageConnection)
    tlsServer.listen(process.env.TLS_PORT || 69)
}
const messagesLog = fs.createWriteStream(`msgs-${Date.now()}.txt`)

const users = {};
const messages = []

function manageConnection(user) {
    try {
    rerenderAll()
    user.id = uuidv4();
    users[user.id] = {
        id: user.id,
        status: 'auth',
        object: user
    };
    user.write(chars.cls)
    user.write(ascii)
    user.write(`${chars.red}Welcome to ${config.name}\n${chars.clear}Please authenticate with (username):(password)\nor create an account by typing signup\n`)

    user.on('end', () => {
        delete users[user.id]
        rerenderAll()
    })
    
    user.on('data', async (d) => {
        const msg = Buffer.from(d).toString('utf-8')
        switch (msg) {
            case 'signup\n':
                users[user.id].status = 'signup'
                users[user.id].signupStep = 1;
                user.write(chars.cls)
                user.write(ascii)
                break;
            default:
                break;
        }
        switch (users[user.id].status) {
            case 'msg':
                sendMessage(user, msg.replace(/(\n|\r)/g, ""))
                break;
            case 'auth':
                let [username, password] = msg.split(':')
                if (!username || !password || msg.split(':').length > 2) {
                    error(user, 'Your login is malformed. It should look like (username):(password)')
                    break;
                }
                let load = spinner(user, 'pulling your account')
                try {
                    const userDoc = await UserSchema.findOne({username})
                    password = password.replace(/(\n|\r)/g, "")
                    const loginSuccess = bcrypt.compareSync(password, userDoc.password)
                    if (loginSuccess) {
                        users[user.id].username = userDoc.username;
                        users[user.id].userDoc = userDoc
                    } else {
                        throw new Error('Login is incorrect')
                    }
                    users[user.id].status = 'msg'
                    clearLoad(user, load)
                    renderUI(user)
                } catch (e) {
                    clearLoad(user, load)
                    error(user, `An error, ${e}, has occurred`)
                    user.write('')
                }
                break;
            case 'signup':
                const step = users[user.id].signupStep
                switch (step) {
                    case 1:
                        user.write('Let\'s make an account\nType in your username: ')
                        users[user.id].signupStep++
                        break;
                    case 2:
                        users[user.id].username = msg.replace(/(\n|\r)/g, "");
                        users[user.id].signupStep++
                        user.write('Okay, now set a password: ')
                        break;
                    case 3:
                        const load = spinner(user, 'Setting up your account')
                        const pswd = msg.replace(/(\n|\r)/g, "");
                        const password = bcrypt.hashSync(pswd, SALT_ROUNDS)
                        try {
                            const newUser = new UserSchema({
                                username: users[user.id].username,
                                password
                            })
                            await newUser.save()
                        } catch (e) {
                            clearLoad(user, load)
                            const errorString = e.toString();
                            if (errorString.indexOf('E11000') != -1) {
                                error(user, `This user already exists, please try again`)
                            } else {
                                error(user, `An error, ${e}, has occurred`)
                            }
                            user.write('Please authenticate with (username):(password)\nor create an account by typing signup\n')
                            users[user.id].status = 'auth';
                            users[user.id].signupStep = 0;
                            break;
                        }
                        setTimeout(() => {clearLoad(user, load); renderUI(user)}, 1500)
                        users[user.id].status = 'msg'
                        users[user.id].userDoc = { admin: false }
                        users[user.id].signupStep++
                        break;
                    default:
                        break;
                }
                break;
            default:
                break;
        }
    })
    } catch (e) {}
}

function spinner(user, text) {
    let spinner = ['-', '\\', '|', '/']
    let enumerator = 0;
    return setInterval(async () => {
        user.write(ascii)
        user.write(`${chars.yellowBg}${chars.black}${spinner[enumerator]} ${config.acronym}>${chars.clear} ${text}`)
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

function clearLoad(user, load) {
    clearInterval(load)
    user.write(`${chars.cls}${chars.nl}`)
}

function generateBorderString(unit) {
    return new Promise((res, rej) => {
        let string = "";
        while (string.length < 80) {
            string = string + unit
        }
        string = string.substr(0, 80)
        string = string + '\n'
        res(string)
    })
}

function getUserString() {
    return Object.values(Object.values(users).map(usr => {
        if (usr.status == 'msg') {
            return usr.username
        } else {
            return;
        }
    })).join(', ');
}

async function renderUI(user) {
    user.write(chars.cls)
    user.write('Your terminal should sized 80x24, resize until lines go across your screen\n')
    user.write(`${config.emoji} | ${config.shortName} | Chat (last message at ${Date.now()})\n`)
    user.write(`Users: ${getUserString()}\n`)
    user.write(await generateBorderString(config.topBorder))
    const msgLength = messages.length
    let needToSkip = 0;
    for (let i = 0; i < 21; i++) {
        if (needToSkip ) {
            needToSkip--;
            continue;
        }
        const txt = messages[msgLength - i] ? messages[msgLength - i] : '\n'
        if (txt.length > 80) {
            needToSkip = Math.ceil(txt.length / 80) - 1;
        }
        user.write(txt)
    }
    user.write(await generateBorderString(config.bottomBorder))
    user.write('Send a message: ')
}

function sendMessage(user, message) {
    const color = users[user.id].userDoc.admin ? chars.red : chars.blue;
    const formattedMessage = `${color}${users[user.id].username}${chars.clear} ▎ ${message}\n`
    messages.push(formattedMessage)
    log(user, message)
    rerenderAll()
}

function rerenderAll() {
    for (const [_, value] of Object.entries(users)) {
        try {
            if (value.status != 'msg') continue;
            if (!value.object.writable) continue;
            renderUI(value.object)
        } catch (_) {}
      }
}

function log(user, message) {
    return new Promise(res => {
        messagesLog.write(`${new Date().toLocaleString()}| ${users[user.id].username}@${user.remoteAddress}: ${message}\n`)
        res()
    })
}
