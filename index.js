const net = require('net')
const fs = require('fs')
const ascii = fs.readFileSync('./ssascii.txt')
const {v4: uuidv4} = require('uuid')
const mongoose = require('mongoose')
mongoose.connect('mongodb+srv://george:ranxnK483yRoXs7y@cluster0.od8lt.gcp.mongodb.net/chat', {useNewUrlParser: true, useUnifiedTopology: true})
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
        required: true,
        unique: true
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
    try {
    user.id = uuidv4();
    users[user.id] = {
        id: user.id,
        status: 'auth',
        object: user
    };
    user.write(chars.cls)
    user.write(ascii)
    user.write(`${chars.red}Welcome to the SheepStudios Server\n${chars.clear}Please authenticate with (username):(password)\nor create an account by typing signup\n`)

    user.on('end', e => {
        console.log(e)
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
                sendMessage(user, msg.replace(/\n/g, ""))
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
                    password = password.replace(/\n/g, "")
                    const loginSuccess = bcrypt.compareSync(password, userDoc.password)
                    if (loginSuccess) {
                        users[user.id].username = userDoc.username;
                    } else {
                        throw new Error('Login is incorrect')
                    }
                    users[user.id].status = 'msg'
                    renderUI(user)
                    clearLoad(user, load)
                } catch (e) {
                    error(user, `An error, ${e}, has occurred`)
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
                        users[user.id].username = msg.replace(/\n/g, "");
                        users[user.id].signupStep++
                        user.write('Okay, now set a password: ')
                        break;
                    case 3:
                        const load = spinner(user, 'Setting up your account')
                        const pswd = msg.replace(/\n/g, "");
                        console.log(pswd, Buffer.from(pswd))
                        const password = bcrypt.hashSync(pswd, SALT_ROUNDS)
                        try {
                            const newUser = new UserSchema({
                                username: users[user.id].username,
                                password
                            })
                            await newUser.save()
                        } catch (e) {
                            error(user, `An error, ${e}, has occurred`)
                        }
                        setTimeout(() => clearLoad(user, load), 1500)
                        users[user.id].status = 'msg'
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
        string = string + '\n'
        string = string.substr(0, 80)
        res(string)
    })
}

function getUserString() {
    let string = ""
    try {
        const len = Object.values(users).length
        Object.values(users).forEach(indUser, i => {
            string += indUser.username;
            if (!(len <= 1) || i != len) {
                string += ", "
            } 
        })
    } catch (_) {}
    return string;
}

async function renderUI(user) {
    user.write(chars.cls)
    user.write(`Users: ${getUserString()}\n`)
    user.write(await generateBorderString('█-█'))
    const msgLength = messages.length
    for (let i = 0; i < 21; i++) {
        const txt = messages[msgLength - i] ? messages[msgLength - i] : '\n'
        user.write(txt)
    }
    user.write(await generateBorderString('█'))
    user.write('Send a message: ')
}

function sendMessage(user, message) {
    console.log(message)
    const formattedMessage = `${users[user.id].username} ▎ ${message}\n`
    messages.push(formattedMessage)
    for (const [_, value] of Object.entries(users)) {
        if (value.status != 'msg') continue;
        renderUI(value.object)
      }
}