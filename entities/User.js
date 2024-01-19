class User {
    constructor({email, password, role,details}) {
        this.email = email;
        this.password = password;
        this.role = role;
        this.details = details;
    }
}

module.exports = User;