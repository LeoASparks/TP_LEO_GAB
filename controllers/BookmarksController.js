const Repository = require('../models/Repository');
const Bookmark = require('../models/bookmark');
const CollectionFilter = require('../models/collectionFilter');
const User = require('../models/user');

module.exports =
    class BookmarksController extends require('./Controller') {
        constructor(req, res) {
            super(req, res, false /* needAuthorization */);
            this.bookmarksRepository = new Repository('Bookmarks');
            this.collectionFilter = new CollectionFilter();
        }
        error(params, message) {
            params["error"] = message;
            this.response.JSON(params);
            return false;
        }
        queryStringParamsList() {
            let content = "<div style=font-family:arial>";
            content += "<h4>List of parameters in query strings:</h4>";
            content += "<h4>? sort=key <br> return all bookmarks sorted by key values (Id, Name, Category, Url)";
            content += "<h4>? sort=key,desc <br> return all bookmarks sorted by descending key values";
            content += "<h4>? key=value <br> return the bookmark with key value = value";
            content += "<h4>? key=value* <br> return the bookmark with key value that start with value";
            content += "<h4>? key=*value* <br> return the bookmark with key value that contains value";
            content += "<h4>? key=*value <br> return the bookmark with key value end with value";
            content += "</div>";
            return content;
        }
        queryStringHelp() {
            // expose all the possible query strings
            this.res.writeHead(200, { 'content-type': 'text/html' });
            this.res.end(this.queryStringParamsList());
        }

        // GET: api/bookmarks
        // GET: api/bookmarks?sort=key&key=value....
        // GET: api/bookmarks/{id}
        get(id) {
            let params = this.getQueryStringParams();
            let bookmarksList = []; 
            let user;
            let username;
            let usersRepository = new Repository('Users')
            // if we have no parameter, expose the list of possible query strings
            if (params === null) {

                if (!isNaN(id)){
                    let bookmark = this.bookmarksRepository.get(id);
                    user = usersRepository.get(parseInt(bookmark.UserId));
                    username = user.Name;                 
                    this.response.JSON({"Id": id, "Name": bookmark.Name, "Url": bookmark.Url, "Category": bookmark.Category, "UserId": bookmark.UserId, "Username": username});
                }
                else{
                    let bookmarks = this.bookmarksRepository.getAll();
                    bookmarks.forEach(bookmark => {
                        user = usersRepository.get(parseInt(bookmark.UserId));
                        username = user.Name;        
                        bookmarksList.push({"Id": bookmark.Id, "Name": bookmark.Name, "Category": bookmark.Category, "Url": bookmark.Url, "UserId": bookmark.UserId, "Username": username});
                    });
                    this.response.JSON(bookmarksList);
                }
            }
            else {
                if (Object.keys(params).length === 0) {
                    this.queryStringHelp();
                } else {                  
                    let bookmarks = this.bookmarksRepository.getAll();
                    bookmarks.forEach(bookmark => {
                        user = usersRepository.get(parseInt(bookmark.UserId));
                        username = user.Name;        
                        bookmarksList.push({"Id": bookmark.Id, "Name": bookmark.Name, "Category": bookmark.Category, "Url": bookmark.Url, "UserId": bookmark.UserId, "Username": username});
                    });

                    this.collectionFilter.init(bookmarksList);
                    if ('name' in params)
                        this.collectionFilter.addSearchKey('name', params['name']);
                    if ('category' in params)
                        this.collectionFilter.addSearchKey('category', params['category']);
                    if ('url' in params)
                        this.collectionFilter.addSearchKey('url', params['url']);
                    if ('username' in params)
                        this.collectionFilter.addSearchKey('username', params['username']);
                    if ('sort' in params)
                        this.collectionFilter.setSortFields(params['sort']);
                    this.response.JSON(this.collectionFilter.get());
                }
            }
        }
        // POST: api/bookmarks body payload[{"Id": 0, "Name": "...", "Url": "...", "Category": "..."}]
        post(bookmark) {
            if (this.requestActionAuthorized()) {
                // validate bookmark before insertion
                if (Bookmark.valid(bookmark)) {
                    // avoid duplicate names
                    if (this.bookmarksRepository.findByField('Name', bookmark.Name) !== null) {
                        this.response.conflict();
                    } else {
                        //bookmark["UserId"] = localStorage.getItem('');
                        let newBookmark = this.bookmarksRepository.add(bookmark);
                        if (newBookmark)
                            this.response.created(newBookmark);
                        else
                            this.response.internalError();
                    }
                } else
                    this.response.unprocessable();
            } else
                this.response.unAuthorized();
        }
        // PUT: api/bookmarks body payload[{"Id":..., "Name": "...", "Url": "...", "Category": "..."}]
        put(bookmark) {
            if (this.requestActionAuthorized()) {
                // validate bookmark before updating
                if (Bookmark.valid(bookmark)) {
                    let foundBookmark = this.bookmarksRepository.findByField('Name', bookmark.Name);
                    if (foundBookmark != null) {
                        if (foundBookmark.Id != bookmark.Id) {
                            this.response.conflict();
                            return;
                        }
                    }
                    if (this.bookmarksRepository.update(bookmark))
                        this.response.ok();
                    else
                        this.response.notFound();
                } else
                    this.response.unprocessable();
            } else
                this.response.unAuthorized();
        }
        // DELETE: api/bookmarks/{id}
        remove(id) {
            if (this.requestActionAuthorized()) {
                if (this.bookmarksRepository.remove(id))
                    this.response.accepted();
                else
                    this.response.notFound();
            } else
                this.response.unAuthorized();
        }
    }