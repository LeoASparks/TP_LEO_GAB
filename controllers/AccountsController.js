const Repository = require('../models/Repository');
const Bookmark = require('../models/bookmark');
const TokenManager = require('../tokenManager');
const utilities = require("../utilities");
const User = require('../models/user');

module.exports =
    class AccountsController extends require('./Controller') {
        constructor(req, res) {
            super(req, res);
            this.usersRepository = new Repository('Users');
        }

        // list of users with masked password
        index(id) {
            if (!isNaN(id)) {
                let user = this.usersRepository.get(id);
                if (user != null) {
                    let userClone = { ...user };
                    userClone.Password = "********";
                    this.response.JSON(userClone);
                }
            }
            else {
                let users = this.usersRepository.getAll();
                let usersClone = users.map(user => ({ ...user }));
                for (let user of usersClone) {
                    user.Password = "********";
                }
                this.response.JSON(usersClone);
            }
        }

        // POST: /token body payload[{"Email": "...", "Password": "...", "grant-type":"password"}]
        login(loginInfo) {
            // to do assure that grant-type is present in the request header
            let user = this.usersRepository.findByField("Email", loginInfo.Email);
            if (user != null) {
                if (user.Password == loginInfo.Password) {
                    let newToken = TokenManager.create(user.Email);
                    newToken["UserId"] = user.Id;
                    newToken["UserEmail"] = user.Email;
                    newToken["UserName"] = user.Name;
                    console.log(newToken)
                    this.response.JSON(newToken);
                } else
                    this.response.badRequest();
            } else
                this.response.badRequest();
        }

        // POST: account/register body payload[{"Id": 0, "Name": "...", "Email": "...", "Password": "..."}]
        register(user) {
            user.Created = utilities.nowInSeconds();
            // validate User before insertion
            if (User.valid(user)) {
                // avoid duplicates Email
                if (this.usersRepository.findByField('Email', user.Email) == null) {
                    // take a clone of the newly inserted user
                    let newUser = { ...this.usersRepository.add(user) };
                    if (newUser) {
                        // mask password in the json object response
                        newUser.Password = "********";
                        this.response.created(newUser);
                    } else
                        this.response.internalError();
                } else
                    this.response.conflict();
            } else
                this.response.unprocessable();
        }
        // todo
        change(user) {
            if (this.requestActionAuthorized()) {
                user.Created = utilities.nowInSeconds();
                console.log(user);
                // validate bookmark before updating
                if (User.valid(user)) {
                    let foundUser = this.usersRepository.findByField('Name', user.UserName);
                    if (foundUser != null) {
                        if (foundUser.Id != user.Id) {
                            this.response.conflict();
                            return;
                        }
                    }
                    if (this.usersRepository.update(user)) {
                        this.response.JSON(user);
                        //this.response.accepted();
                    }
                    else
                        this.response.notFound();
                } else
                    this.response.unprocessable();
            } else
                this.response.unAuthorized();
        }
        // todo
        remove(userid) {
            if (this.requestActionAuthorized()) {
                if (this.usersRepository.remove(userid)) {
                    let indexToDelete = [];
                    let index = 0;
                    let bookmarksRepository = new Repository('Bookmarks');
                    let bookmarkslist = bookmarksRepository.getAll();

                    for(let bookmark of bookmarkslist) {
                        if (bookmark.UserId == userid)
                            indexToDelete.push(index);
                        index ++;
                	}
                    bookmarksRepository.removeByIndex(indexToDelete);

                    this.response.accepted();
                }
                else
                    this.response.notFound();
            } else
                this.response.unAuthorized();
        }
    }