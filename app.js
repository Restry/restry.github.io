AV.init({
  appId: 'Kc6PhHPTJatta4OTCV8QlhQX-gzGzoHsz',
  appKey: 'fWa6dHSX5fiSY7XwGzqYYRvc',
})

var Todo = AV.Object.extend('Todo')

// visibility filters
var filters = {
  all: function (todos) {
    return todos
  },
  active: function (todos) {
    return todos.filter(function (todo) {
      return !todo.done
    })
  },
  completed: function (todos) {
    return todos.filter(function (todo) {
      return todo.done
    })
  }
}

// app Vue instance
var app = new Vue({
  // app initial state
  data: {
    todos: [],
    newTodo: '',
    editedTodo: null,
    visibility: 'all',
    username: '',
    password: '',
    user: null
  },
  
  created: function() {
    var user = AV.User.current()
    if (user) {
      // user.isAuthenticated().then(function(authenticated) {
      //   if (authenticated) {
          this.user = user.toJSON()
      //   }
      // }.bind(this))
    }
  },

  watch: {
    'user.objectId': {
      handler: function (id) {
        if (id) {
          new AV.Query(Todo)
            .equalTo('user', AV.Object.createWithoutData('User', id))
            .find()
            .then(function(todos) {
              this.todos = todos.map(function(todo) {
                return todo.toJSON()
              })
            }.bind(this))
            .catch(alert)
        } else {
          this.todos = []
        }
      },
    }
  },

  // computed properties
  // https://vuejs.org/guide/computed.html
  computed: {
    filteredTodos: function () {
      return filters[this.visibility](this.todos)
    },
    remaining: function () {
      return filters.active(this.todos).length
    },
    allDone: {
      get: function () {
        return this.remaining === 0
      },
      set: function (done) {
        AV.Object.saveAll(
          filters[done ? 'active' : 'completed'](this.todos).map(function(todo) {
            todo.done = done;
            return AV.Object.createWithoutData('Todo', todo.objectId).set('done', done)
          })
        )
      }
    }
  },

  filters: {
    pluralize: function (n) {
      return n === 1 ? 'item' : 'items'
    }
  },

  // methods that implement data logic.
  // note there's no DOM manipulation here at all.
  methods: {
    login: function() {
      AV.User.logIn(this.username, this.password).then(function(user) {
        this.user = user.toJSON()
        this.username = this.password = ''
      }.bind(this)).catch(alert)
    },
    
    signup: function() {
      AV.User.signUp(this.username, this.password).then(function(user) {
        this.user = user.toJSON()
        this.username = this.password = ''
      }.bind(this)).catch(alert)
    },

    logout: function() {
      AV.User.logOut()
      this.user = null
    },
    
    addTodo: function () {
      var value = this.newTodo && this.newTodo.trim()
      if (!value) {
        return
      }
      var acl = new AV.ACL()
      acl.setPublicReadAccess(false)
      acl.setPublicWriteAccess(false)
      acl.setReadAccess(AV.User.current(), true)
      acl.setWriteAccess(AV.User.current(), true)
      new Todo({
        content: value,
        done: false,
        user: AV.User.current()
      }).setACL(acl).save().then(function(todo) {
        this.todos.push(todo.toJSON())
      }.bind(this)).catch(alert)
      this.newTodo = ''
    },

    removeTodo: function (todo) {
      AV.Object.createWithoutData('Todo', todo.objectId)
        .destroy()
        .then(function() {
          this.todos.splice(this.todos.indexOf(todo), 1)
        }.bind(this))
        .catch(alert)
    },

    editTodo: function (todo) {
      this.beforeEditCache = todo.content
      this.editedTodo = todo
    },

    doneEdit: function (todo) {
      this.editedTodo = null
      todo.content = todo.content.trim()
      AV.Object.createWithoutData('Todo', todo.objectId).save({
        content: todo.content,
        done: todo.done
      }).catch(alert)
      if (!todo.content) {
        this.removeTodo(todo)
      }
    },

    cancelEdit: function (todo) {
      this.editedTodo = null
      todo.content = this.beforeEditCache
    },

    removeCompleted: function () {
      AV.Object.destroyAll(filters.completed(this.todos).map(function(todo) {
        return AV.Object.createWithoutData('Todo', todo.objectId)
      })).then(function() {
        this.todos = filters.active(this.todos)
      }.bind(this)).catch(alert)
    }
  },

  // a custom directive to wait for the DOM to be updated
  // before focusing on the input field.
  // https://vuejs.org/guide/custom-directive.html
  directives: {
    'todo-focus': function (el, value) {
      if (value) {
        el.focus()
      }
    }
  }
})

// handle routing
function onHashChange () {
  var visibility = window.location.hash.replace(/#\/?/, '')
  if (filters[visibility]) {
    app.visibility = visibility
  } else {
    window.location.hash = ''
    app.visibility = 'all'
  }
}

window.addEventListener('hashchange', onHashChange)
onHashChange()

// mount
app.$mount('.todoapp')