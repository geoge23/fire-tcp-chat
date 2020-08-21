const bcrypt = require('bcrypt')
const PASS = 'geoge'
const SALT_ROUNDS = 10

const HASH = bcrypt.hashSync(PASS, SALT_ROUNDS)
console.log(bcrypt.compareSync(PASS, HASH))