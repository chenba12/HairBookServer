class User {
    constructor({name, email, password, role}) {
        this.email = email;
        this.password = password;
        this.role = role;
    }
}

module.exports = User;