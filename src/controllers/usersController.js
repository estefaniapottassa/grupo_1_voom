const { validationResult } = require('express-validator')

const User = require('../models/users');

const bcryptjs = require('bcryptjs');

const usersController = {
    register: function(req, res) {
        // res.cookie(); 
        res.render('register');
    },

    processRegister: (req, res) => {

        //Hago la validacion de lo que viene en el request:
        const result = validationResult(req);
        // Esto me devuelve un objeto literal con la propiedad errors, y dentro de esto un array con los campos que tuvieron error, 
        //tiene un indice por cada campo que valide, y en cada indice tiene un objeto literal

        //si hay errores (el array no esta vacio, es decir la propiedad errors del objeto):
        //el mapped() es un metodo de express que toma el array y lo convierte en objeto literal
        if(result.errors.length > 0){
            res.render('register', { 
                errors : result.mapped(),
                oldData: req.body //Para mantener la info que estaba bien y no dio error, desp la paso a la vista
            });
        }

        //VALIDACION: Antes de crearlo chequeo si ya hay un usuario registrado con ese mail:
        let userInDb = User.findByField('email', req.body.email);
        if(userInDb) {
            res.render('register', { 
                errors : { email : { msg: 'Este email ya esta registrado'}},
                oldData: req.body
            });
        };

        //Le agrego la imagen que viene en el req.file, no en el body, y le piso la contrasena por una hasheada:
        let userToCreate = {
            ...req.body,
            password: bcryptjs.hashSync(req.body.password, 10), // este password va a pisar el campo con el mismo nombre que viene en el body, que seria la contrasena sin hashear
            profileImage: req.file.filename
        };

        //Creo el usuario, lo guardo en una variable y redirijo al login:
        let userCreated = User.create(userToCreate);
        return res.redirect('/users/login'); 
        },
        
    login: function(req, res) {
        res.render('login');
    },

    loginProcess: (req, res) => {
        let userToLogin = User.findByField('email', req.body.email);

        //VALIDACIONES: verifico si existe un usuario con ese mail, y luego si la contrasena es correcta:
        if(userToLogin){
            let isPasswordOk = bcryptjs.compareSync(req.body.password, userToLogin.password)
            if(isPasswordOk){

                //Antes de redirigir me guargo la info del usuario logueado para usarlo en session:
                delete userToLogin.password; //el password no quiero que quede guardado en session (el delete es un operador que remueve una propiedad de un objeto)
                req.session.userLogged = userToLogin;

                //Seteo una cookie
                if(req.body.remember_user){
                    res.cookie('userEmail', req.body.email, { maxAge: (1000 * 60) *2}); //primero le paso el nombre, desp lo que quiero que me guarde y desp la duracion
                }


                //Si esta ok la contrasena redirijo al perfil del usuario:
                return res.redirect('/users/profile');
            }
            //Si la contrasena es incorrecta mando error a la vista:
            return res.render('login', { errors: { email : {msg: 'Las credenciales son invalidas'}}})
        }

        //Si no encuentra el email manda un error a la vista:
        return res.render('login', { errors: { email : {msg: 'No se encuentra este email en la base de datos'}}})
    },

    profile: function(req, res) {

        res.render('userProfile', { user: req.session.userLogged  }); //mando a la vista el nombre del usuario loggeado
    },

    logout: function(req, res) {
        res.clearCookie('userEmail'); //tengo que borrar la cookie porque si no voy a seguir loggeado aunque haga logout, porque la cookie le va a seguir pasando el usuario a session hasta que pase el tiempo seteado y se destruya
        req.session.destroy(); //el destroy borra todo lo que esta en session
        return res.redirect('/');
    }
}

module.exports = usersController;