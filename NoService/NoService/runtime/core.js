// NoService/NoService/runtime/core.js
// Description:
// "core.js" control main behavior of deamon.
// Copyright 2018-2019 NOOXY. All Rights Reserved.
'use strict';

const fs = require('fs');

const Constants = require('./constants');
const Implementation = require('./implementation');
const Plugin = require('./plugin');

function Core(NoServiceLibrary, settings) {
  const Log = null;
  const Connection = NoServiceLibrary.Connection.Connection;
  const Utils = NoServiceLibrary.Library.Utilities;
  const NoCrypto = NoServiceLibrary.Crypto.Crypto;

  // router
  const Router = NoServiceLibrary.Router.Router;
  const NSPS = NoServiceLibrary.Router.NSPS;

  // auth
  const Authorization = NoServiceLibrary.Authorization.Authorization;
  const AuthorizationHandler = NoServiceLibrary.Authorization.AuthorizationHandler;

  // service
  const Service = NoServiceLibrary.Service.Service;
  const Worker = NoServiceLibrary.Service.Worker;
  const ServiceAPI = NoServiceLibrary.Service.ServiceAPI;
  const Entity = NoServiceLibrary.Service.Entity;
  const Activty = NoServiceLibrary.Service.Activty;

  // db
  const Database = NoServiceLibrary.Database.Database;
  const Model = NoServiceLibrary.Database.Model;
  const Authenticity = NoServiceLibrary.Database.Authenticity;

  Utils.printLOGO(Constants.version, Constants.copyright);

  let verbose = (tag, log) => {
    if(settings.verbose||settings.debug) {
      Utils.TagLog(tag, log);
    };
  };

  let _runtime_id = Utils.generateGUID();
  let _path = settings['path'];
  verbose('Daemon', 'Path setted as '+ _path);
  if(settings.service.services_path[0] != '/')
    settings.service.services_path = _path+settings.service.services_path;
  if(settings.service.services_files_path[0] != '/')
    settings.service.services_files_path = _path+settings.service.services_files_path;
  if(settings.plugins_path[0] != '/')
    settings.plugins_path = _path+settings.plugins_path;
  if(settings.security.RSA2048_private_key[0] != '/')
    settings.security.RSA2048_private_key = settings.security.RSA2048_private_key;
  if(settings.security.RSA2048_public_key[0] != '/')
    settings.security.RSA2048_public_key = settings.security.RSA2048_public_key;
  // initialize variables
  let _connection;
  let _authorization;
  let _authorizationhandler;
  let _authenticity;
  let _router;
  let _service;
  let _activity;
  let _entity;
  let _serviceAPI;
  let _implementation;
  let _nocrypto;
  let _nsps;
  let _worker;
  let _database;
  let _model;


  this.checkandlaunch = (callback) => {
    // initialize environment
    verbose('Daemon', 'Checking environment...')

    if (this.isinitialized() === false) {
      this.initialize((err)=>{
        if(err) {
          verbose('*ERR*', 'Error occured during initializing.');
          console.log(err);
          this.onTerminated();
          if(callback)
            callback(err);
        }
        else {
          Utils.TagLog('OKAY', 'Initialized. Please restart!');
          if(callback)
            callback('Initialized. Please restart!');
        }
      });
    }
    else {
      this.launch(callback);
    }
    ;
  };

  this.launch = (callback) => {
    let launchwrap = ()=>{

      // initialize variables
      // verbose('Daemon', 'Initializing variables.')
      // // let _connection;
      // // let _authorization;
      // // let _authorizationhandler;
      // // let _authenticity;
      // // let _router;
      // // let _service;
      // // let _entity;
      // // let _serviceAPI;
      // // let _implementation;
      // // let _nocrypto;
      // // let _nsps;
      // verbose('Daemon', 'Initializing variables done.')
      // setup variables
      verbose('Daemon', 'Setting up variables.')
      _connection = new Connection({allow_ssl_self_signed: true});
      _authorization = new Authorization();
      _authorizationhandler = new AuthorizationHandler();
      _authenticity = new Authenticity();
      _router = new Router();
      _service = new Service();
      _activity = new Activty();
      _entity = new Entity();
      _serviceAPI = new ServiceAPI();
      _implementation = new Implementation();
      _nocrypto = new NoCrypto();
      _nsps = new NSPS();
      _database = new Database(settings.database);
      _model = new Model();
      _worker = new Worker()

      //
      let _daemon = {
        Settings: settings,
        close: () => {
          if(!_daemon.close_emmited) {
            _daemon.close_emmited = true;
            _connection.close();
            _router.close();
            _activity.close();
            _service.close(()=> {
              _authorization.close();
              _authorizationhandler.close();
              _authenticity.close();
              _entity.close();
              _serviceAPI.close();
              _implementation.close();
              _nocrypto.close();
              _nsps.close();
              _worker.close();
              verbose('Daemon', 'Stopping daemon in '+settings.kill_daemon_timeout_millisecond+'ms.');
              setTimeout(this.onTerminated, settings.kill_daemon_timeout_millisecond);
            });
          }
        },
        relaunch: ()=> {
          if(!_daemon.close_emmited) {
            _daemon.close_emmited = true;
            _connection.close();
            _router.close();
            _activity.close();
            _service.close(()=> {
              _authorization.close();
              _authorizationhandler.close();
              _authenticity.close();
              _entity.close();
              _serviceAPI.close();
              _implementation.close();
              _nocrypto.close();
              _nsps.close();
              _worker.close();
              verbose('Daemon', 'Relaunching daemon in '+settings.kill_daemon_timeout_millisecond+'ms.');
              setTimeout(this.onRelaunch, settings.kill_daemon_timeout_millisecond);
            });
          }
        },
        Constants: Constants
      }

      this.close = _daemon.close;


      // create gateway
      verbose('Daemon', 'Creating coregateway...');
      let coregateway = {
          Database: _database,
          Model: _model,
          Utilities: Utils,
          Settings: settings,
          Authorization: _authorization,
          AuthorizationHandler: _authorizationhandler,
          Service : _service,
          Activity: _activity,
          Connection: _connection,
          Router: _router,
          ServiceAPI: _serviceAPI,
          Entity: _entity,
          Authenticity: _authenticity,
          Implementation: _implementation,
          NoCrypto: _nocrypto,
          NSPS: _nsps,
          Daemon: _daemon,
          Constants: Constants
        };
      verbose('Daemon', 'Creating coregateway done.')

      // initialize settings
      // trust myself
      settings.connection.servers.push({
            "type": "Local",
            "ip": "LOCALIP",
            "port": "LOCALPORT"
      });

      if(settings.connection.default_server === 'Local' || !settings.connection.default_server ) {
        settings.connection.default_server = settings.connection.servers.length-1;
      }

      for(let i in settings.connection.servers) {
        settings.security.trusted_domains.push(settings.connection.servers[i].ip);
      }

      // start setting up
      verbose('Daemon', 'Loading plugins with initilalized NoService.');

      let plugins = require("fs").readdirSync(settings.plugins_path).map((file)=> { return require(settings.plugins_path+"/" + file);});
      let plugins_from_services = [];
      settings.service.services.forEach((file)=> {
        if(require("fs").existsSync(settings.service.services_path+"/" + file+'/plugin')) {
          plugins_from_services.push(require(settings.service.services_path+"/" + file+'/plugin'));
        }
      })

      Plugin.startPlugins(plugins.concat(plugins_from_services), coregateway, true, settings, (err)=> {
        if(err) {
          callback(err);
        }
        else {
          // setup NOOXY Service protocol secure
          try {
            _nsps.importRSA2048KeyPair(fs.readFileSync(settings.security.RSA2048_private_key, 'utf8'), fs.readFileSync(settings.security.RSA2048_public_key, 'utf8'));
            _nsps.importCryptoModule(_nocrypto);
            _nsps.importOperationTimeout(settings.security.operations_timeout_second);
            // setup router
            _router.importCore(coregateway);
          }
          catch(e) {
            Utils.TagLog('*ERR*', e.stack);
          }

          // setup connection
          _connection.setDebug(settings.debug);
          if(settings.security.ssl_private_key!=null && settings.security.ssl_certificate!=null) {
            // read ssl certificate
            let privateKey = fs.readFileSync(settings.security.ssl_private_key, 'utf8');
            let certificate = fs.readFileSync(settings.security.ssl_certificate, 'utf8');
            _connection.importSSLPrivateKey(privateKey);
            _connection.importSSLCert(certificate);
          }

          _connection.importConnectionMethodNameMap(Constants.CONNECTION_METHOD_NAME_MAP);

          for(let server in settings.connection.servers) {
            _connection.addServer(settings.connection.servers[server].type,
               settings.connection.servers[server].ip, settings.connection.servers[server].port);
          }

          _connection.importHeartBeatCycle(settings.heartbeat_cycle_millisecond);


          //
          // // setup implementation
          // _implementation.importConnectionModule(_connection);

          // connect to database
          verbose('Daemon', 'Connecting to database.')
          _database.connect((err)=> {
            if(err) {
              Utils.TagLog('*ERR*', 'Occur failure on connecting database.');
              throw(err);
            }
            verbose('Daemon', 'Importing Database to Model...');
            // Import connected db to model module
            _model.setTableName(Constants.MODEL_TABLE_NAME);
            _model.setTablePrefix(Constants.MODEL_TABLE_PREFIX);
            _model.setIndexkey(Constants.MODEL_INDEX_KEY);
            _model.setGroupkey(Constants.MODEL_GROUP_KEY);

            _model.importDatabase(_database, (err)=> {
              if(err) {
                Utils.TagLog('*ERR*', 'Occur failure on importing database for model.');
                throw(err);
              }
              verbose('Daemon', 'Importing Model to Authenticity...')

              // setup authenticity
              _authenticity.TokenExpirePeriod = settings.security.token_expire_period_day;
              _authenticity.setDefaultUsername(Constants.default_user.username);
              _authenticity.setUserModelName(Constants.AUTHE_USER_MODEL_NAME);

              _authenticity.importModelModule(_model, (err)=> {
                if(err) {
                  Utils.TagLog('*ERR*', 'Occur failure on importing model for authenticity.');
                  throw(err);
                }
                // setup entity
                // pass

                // setup authorization
                _authorization.importAuthenticityModule(_authenticity);
                _authorization.importEntityModule(_entity);
                _authorization.importTrustedDomains(settings.security.trusted_domains);
                _authorization.importDaemonAuthKey(settings.security.daemon_authorization_key);

                _authorizationhandler.importImplementation(_implementation);

                // setup service: Activity
                _activity.spawnClient = _connection.createClient;
                _activity.setDefaultUsername(Constants.default_user.username);
                _activity.importDaemonAuthKey(settings.security.daemon_authorization_key);
                _activity.setDebug(settings.debug);

                // setup service: Service
                _service.setDebug(settings.debug);
                _service.importWorkerModule(_worker);
                _service.setDebugService(settings.service.debug_service);
                _service.setMasterService(settings.service.master_service);
                _service.setupServicesPath(settings.service.services_path);
                _service.setupServicesFilesPath(settings.service.services_files_path);
                _service.importAuthorization(_authorization);
                _service.importAuthenticity(_authenticity);
                // add shell related service to List.
                if(settings.service.shell_service != null) {
                  let index = settings.service.services.indexOf(settings.service.shell_service);
                  if(index>=0)
                    settings.service.services.splice(index, 1);
                  settings.service.services.push(settings.service.shell_service);
                }
                if(settings.service.shell_client_service != null) {
                  let index = settings.service.services.indexOf(settings.service.shell_client_service);
                  if(index>=0)
                    settings.service.services.splice(index, 1);
                  settings.service.services.push(settings.service.shell_client_service);

                }
                // add debug
                if(settings.service.debug_service != null ) {
                  let index = settings.service.services.indexOf(settings.service.debug_service);
                  if(index>=0)
                    settings.service.services.splice(index, 1);
                  settings.service.services.unshift(settings.service.debug_service);
                }
                verbose('Daemon', 'Debug service enabled.');

                _service.importServicesList(settings.service.services);
                _service.importEntity(_entity);
                _service.importAPI(_serviceAPI);
                _service.importOwner(settings.service.local_services_owner);
                // setup Worker
                _worker.setCloseTimeout(settings.kill_daemon_timeout_millisecond);
                _worker.setClearGarbageTimeout(settings.clear_garbage_timeout);
                _worker.setConstantsPath(require("path").join(__dirname, './constants.json'));
                _worker.setUnixSocketPath(Constants.WORKER_UNIX_SOCK_PATH);
                _worker.start(()=> {
                  // setup api
                  _serviceAPI.importCore(coregateway);

                  verbose('Daemon', 'Setting up variables done.');

                  // launch services
                  verbose('Daemon', 'Launching services...');
                  _service.launch((err)=> {
                    if(err) {
                      _daemon.close();
                    }
                  });
                  verbose('Daemon', 'Launching services done.');
                  //
                  verbose('Daemon', 'NOOXY Service Framework successfully started.');
                  if(callback)
                    callback(false);
                  if(!settings.service.shell_service) {
                    verbose('Shell', 'Shell Service not implemented.');
                  }

                  if(!settings.service.shell_client_service) {
                    verbose('Shellc', 'Local Shell not implemented.');
                  }
                });
              });
            });
          });
        }
      });
    };
    launchwrap();
  }

  this.isinitialized = () => {
    if (fs.existsSync('eula.txt')) {
      if(settings.sercure === false) {
        return true;
      }
      else if(fs.existsSync(settings.security.RSA2048_private_key) && fs.existsSync(settings.security.RSA2048_public_key)) {
        return true;
      }
      else {
        Utils.TagLog('*ERR*', 'Secure is on. But RSA2048 Key Pair is not set. Please geneate it by openssl.');
        Utils.TagLog('*ERR*', 'Your settings:');
        Utils.TagLog('*ERR*', 'PrivateKey: '+settings.security.RSA2048_private_key);
        Utils.TagLog('*ERR*', 'PublicKey: '+settings.security.RSA2048_public_key);
        Utils.TagLog('*ERR*', '-');
        Utils.TagLog('*ERR*', 'You can generate it in UNIX system by openssl.');
        Utils.TagLog('*ERR*', '$ openssl genrsa -des3 -out private.pem 2048');
        Utils.TagLog('*ERR*', '$ openssl rsa -in private.pem -outform PEM -pubout -out public.pem');
        Utils.TagLog('*ERR*', '$ openssl rsa -in private.pem -out private.pem -outform PEM');
        this.onTerminated();
        return false;
      }
    }
    else {
      return false;
    }
  }

  this.initialize = (callback) => {
    verbose('Daemon', 'Initializing NoService daemon...')
    verbose('Daemon', 'Checking Database and Authenticity...');

    let _init_db = new Database(settings.database);
    let _init_model = new Model();
    let _init_auth = new Authenticity();

    verbose('Daemon', 'Loading plugins without initilalized NoService.');

    let plugins = require("fs").readdirSync(settings.plugins_path).map((file)=> { return require(settings.plugins_path+"/" + file);});
    let plugins_from_services = [];
    settings.service.services.forEach((file)=> {
      if(require("fs").existsSync(settings.service.services_path+"/" + file+'/plugin')) {
        plugins_from_services.push( require(settings.service.services_path+"/" + file+'/plugin'));
      }
    })
    Plugin.startPlugins(plugins, null, false, settings, (err)=> {
      if(err) {
        callback(err);
      }
      else {
        // Connect to db
        _init_db.connect((err)=> {
          if(err) {
            Utils.TagLog('*ERR*', 'Occur failure on connecting database.');
            throw(err);
          }
          verbose('Daemon', 'Importing Database...')
          // Import connected db to model module
          _init_model.setTableName(Constants.MODEL_TABLE_NAME);
          _init_model.setTablePrefix(Constants.MODEL_TABLE_PREFIX);
          _init_model.setIndexkey(Constants.MODEL_INDEX_KEY);
          _init_model.setGroupkey(Constants.MODEL_GROUP_KEY);

          _init_model.importDatabase(_init_db, (err)=> {
            if(err) {
              Utils.TagLog('*ERR*', 'Occur failure on importing database for model.');
              throw(err);
            }
            verbose('Daemon', 'Importing Model...')
            // setup authenticity
            _init_auth.TokenExpirePeriod = settings.security.token_expire_period_day;
            _init_auth.setDefaultUsername(Constants.default_user.username);
            _init_auth.setUserModelName(Constants.AUTHE_USER_MODEL_NAME);
            // Import set Model Module to authenticity.
            _init_auth.importModelModule(_init_model, (err)=>{
              if(err) {
                Utils.TagLog('*ERR*', 'Occur failure on importing model for authenticity.');
                throw(err);
              }
              verbose('Daemon', 'Initializing authenticity...')
              _init_auth.createUser(Constants.default_user.username, Constants.default_user.displayname, Constants.default_user.password, 0, null, 'The', 'Admin', (err)=> {
                if(err) {
                  Utils.TagLog('*ERR*', 'Occur failure on creating database.');
                  console.log(err);
                  callback(err);
                }
                else {
                  verbose('Daemon', 'NoService Superuser "'+Constants.default_user.username+'" with password "'+Constants.default_user.password+'" created. Please change password later for security.');
                  verbose('Daemon', 'Creating eula...')
                  fs.writeFile('./eula.txt', '', (err)=> {
                    if(err) {
                      Utils.TagLog('*ERR*', 'Writing EULA error.');
                      console.log(err);
                      callback(err);
                    }
                    else {
                      verbose('Daemon', 'NoService daemon initilalized.');
                      callback(err);
                    }
                  });
                }
              });
            });
          });
        });
      }
    });
  }
}

module.exports = Core;
