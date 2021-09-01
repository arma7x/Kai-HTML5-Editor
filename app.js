const APP_VERSION = '1.0.0';

window.addEventListener("load", function() {

  localforage.setDriver(localforage.LOCALSTORAGE);

  // const THUMBS = {};
  const state = new KaiState({});

  const helpSupportPage = new Kai({
    name: 'helpSupportPage',
    data: {
      title: 'helpSupportPage'
    },
    templateUrl: document.location.origin + '/templates/helpnsupport.html',
    mounted: function() {
      this.$router.setHeaderTitle('Help & Support');
    },
    unmounted: function() {},
    methods: {},
    softKeyText: { left: '', center: '', right: '' },
    softKeyListener: {
      left: function() {},
      center: function() {},
      right: function() {}
    }
  });

  const changelogs = new Kai({
    name: 'changelogs',
    data: {
      title: 'changelogs'
    },
    templateUrl: document.location.origin + '/templates/changelogs.html',
    mounted: function() {
      this.$router.setHeaderTitle('Changelogs');
    },
    unmounted: function() {},
    methods: {},
    softKeyText: { left: '', center: '', right: '' },
    softKeyListener: {
      left: function() {},
      center: function() {},
      right: function() {}
    }
  });

  const editor = function($router, blob) {
    const reader = new FileReader();
    reader.onload = () => {
      $router.push(
        new Kai({
          name: 'editor',
          data: {
            title: 'editor',
            code: reader.result.trim(),
          },
          verticalNavClass: '.editorNav',
          templateUrl: document.location.origin + '/templates/editor.html',
          mounted: function() {
            this.$router.setHeaderTitle('Editor');
            const box = document.getElementById('editorInput');
            box.focus();
            box.setSelectionRange(box.value.length, box.value.length);
            box.addEventListener('keydown', this.methods.inputKeyDownListener);
          },
          unmounted: function() {
            const box = document.getElementById('editorInput');
            box.removeEventListener('keydown', this.methods.inputKeyDownListener);
          },
          methods: {
            inputKeyDownListener: function(evt) {
              if (evt.key === 'Call') {
                var menu = [
                  {'text': 'Save'},
                  {'text': 'Execute'},
                  {'text': 'Exit'},
                ]
                $router.showOptionMenu('Menu', menu, 'SELECT', (selected) => {
                  if (selected.text === 'Execute') {
                    const _blob = new Blob([document.getElementById('editorInput').value.trim()], {type : blob.type});
                    execute($router, _blob);
                  } else if (selected.text === 'Save') {
                    var DS;
                    if (window['__DS__']) {
                      DS = window['__DS__'];
                    } else {
                      DS = new DataStorage(() => {}, () => {}, false);
                    }
                    const paths = blob.name.split('/');
                    if (paths.length > 1 && paths[0] === '') {
                      paths.splice(0,1);
                      DS.trailingSlash = '/';
                    }
                    const name = paths.pop();
                    DS.deleteFile([...paths], name, true)
                    .then(() => {
                      const _blob = new Blob([document.getElementById('editorInput').value.trim()], {type : blob.type});
                      return  DS.addFile([...paths], name, _blob);
                    })
                    .then(() => {
                      $router.showToast('Saved');
                    })
                    .catch((err) => {
                      $router.showToast(err.toString());
                    });
                  } else if (selected.text === 'Exit') {
                    setTimeout(() => {
                      document.activeElement.blur();
                      $router.pop();
                    }, 100);
                  }
                }, () => {
                  
                });
              }
            }
          },
          softKeyText: { left: '', center: '', right: '' },
          softKeyListener: {
            left: function() {},
            center: function() {},
            right: function() {}
          },
          softKeyInputFocusText: { left: '-', center: 'CALL', right: '+' },
          softKeyInputFocusListener: {
            left: function() {
              const box = document.getElementById('editorInput');
              console.log(box.style.fontSize);
              box.style.fontSize = `${parseInt(box.style.fontSize) - 2}%`;
            },
            center: function() {},
            right: function() {
              const box = document.getElementById('editorInput');
              console.log(box.style.fontSize);
              box.style.fontSize = `${parseInt(box.style.fontSize) + 2}%`;
            }
          },
          dPadNavListener: {
            arrowUp: function() {
              document.getElementById('editorInput').focus();
            },
            arrowDown: function() {
              document.getElementById('editorInput').focus();
            },
          },
        })
      );
    };
    reader.onerror = (err) => {
      console.log(err);
    };
    reader.readAsText(blob);
  }

  const execute = function($router, blob) {
    const reader = new FileReader();
    reader.onload = () => {
      if (blob.type === 'application/javascript' || blob.type === 'application/x-javascript' || blob.type === 'text/html') {
        const safe = escape(reader.result);
        var httpServer = new HTTPServer(8090);
        window['httpServer'] = httpServer;
        httpServer.addEventListener('request', (evt) => {
          var request  = evt.request;
          var response = evt.response;
          if (request.path !== "/index.html") {
            response.send('', 400);
            return;
          }
          var HTML = blob.type === 'text/html' ? reader.result : `<!DOCTYPE html>
            <html>
            <head>
            <title>Console.log Output</title>
            </head>
            <body style="background-color:#000;color:#fff;font-size:80%;margin:0px;padding:0px;">
            <div id="output" style="margin:0px;padding:2px;"></div>
            <script>
              try {
                console.log = function(value) {
                  const output = document.getElementById('output');
                  if (arguments.length > 0) {
                    const values = [];
                    for (var i=0;i<arguments.length;i++) {
                      values.push(arguments[i]);
                    }
                    if (output.innerHTML == "") {
                      output.innerHTML = values.join(', ');
                    } else {
                      output.innerHTML = output.innerHTML + '<br>' + values.join(', ');
                    }
                  }
                };
                var exec = "${safe}";
                eval(unescape(exec));
              } catch(e) {
                console.log(e.toString());
              }
            </script> 
            </body>
            </html>
          `;
          response.send(HTML);
        });
        try {
          httpServer.start();
          var KAIOS_BROWSER = window.open('http://127.0.0.1:8090/index.html');
          var TIMER = setInterval(() => {
            if (KAIOS_BROWSER.closed) {
              clearInterval(TIMER);
              httpServer.stop();
              const current = $router.stack[$router.stack.length - 1];
              current.dPadNavListener.arrowDown();
            }
          }, 100);
        } catch(e) {
          console.log(e);
        }
      } else {
        var KAIOS_BROWSER = window.open(URL.createObjectURL(blob));
        var TIMER = setInterval(() => {
          if (KAIOS_BROWSER.closed) {
            clearInterval(TIMER);
            httpServer.stop();
            const current = $router.stack[$router.stack.length - 1];
            current.dPadNavListener.arrowDown();
          }
        }, 100);
      }
    };
    reader.onerror = (err) => {
      console.log(err);
    };
    reader.readAsText(blob);
  }

  const homepage = new Kai({
    name: 'home',
    data: {
      title: 'home',
      files: []
    },
    verticalNavClass: '.homeNav',
    templateUrl: document.location.origin + '/templates/home.html',
    mounted: function() {
      this.$router.setHeaderTitle('HTML5 Editor');
      this.$router.setSoftKeyCenterText('OPEN');
      localforage.getItem('APP_VERSION')
      .then((v) => {
        if (v == null || v != APP_VERSION) {
          localforage.setItem('APP_VERSION', APP_VERSION)
          this.$router.showToast(`Updated to version ${APP_VERSION}`);
          this.$router.push('changelogs');
        } else {
          localforage.getItem('FILES')
          .then((files) => {
            if (!files) {
              window['__DS__'] = new DataStorage(this.methods.onChange, this.methods.onReady);
              setTimeout(() => {
                this.$router.showToast('Please `Kill App` if you think the app was hang');
              }, 30000);
            } else {
              files.forEach((file) => {
                if (file.id == null) {
                  const hashids2 = new Hashids(file.path, 15);
                  const _vid = hashids2.encode(1);
                  file.id = _vid;
                }
                if (file.src == null) {
                  file.src = '/icons/icon.png';
                }
              });
              this.setData({files: files});
            }
          });
        }
      });
    },
    unmounted: function() {
      if (window['__DS__']) {
        window['__DS__'].destroy();
      }
    },
    methods: {
      selected: function() {},
      onChange: function(fileRegistry, documentTree, groups) {
        const current = this.$router.stack[this.$router.stack.length - 1].name;
        if (current !== 'home') {
          return
        }
        var files = [];
        if (groups['application']) {
          files = [...files, ...groups['application']]
        }
        if (groups['text']) {
          files = [...files, ...groups['text']]
        }
        this.methods.runFilter(files);
      },
      onReady: function(status) {
        if (status) {
          this.$router.hideLoading();
        } else {
          this.$router.showLoading(false);
        }
      },
      runFilter: function(fileRegistry) {
        var files = []
        fileRegistry.forEach((file) => {
          var n = file.split('/');
          var n1 = n[n.length - 1];
          var exts = n1.split('.');
          if (exts.length > 1) {
            const ext = exts[exts.length - 1];
            if (['js', 'html', 'txt' , 'md'].indexOf(ext) > -1) {
              const hashids2 = new Hashids(file, 15);
              const _vid = hashids2.encode(1);
              files.push({'name': n1, 'path': file, id: _vid, src: `/img/${ext}.png`});
            }
          }
        });
        files.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))
        this.setData({files: files});
        localforage.setItem('FILES', files);
      },
      search: function(keyword) {
        this.verticalNavIndex = -1;
        localforage.getItem('FILES')
        .then((files) => {
          if (!files) {
            files = [];
          }
          var result = [];
          files.forEach((file) => {
            if (keyword === '' || (file.name.toLowerCase().indexOf(keyword.toLowerCase()) > -1)) {
              result.push(file);
            }
          });
          result.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))
          this.setData({files: result});
        });
      }
    },
    softKeyText: { left: 'Menu', center: 'OPEN', right: 'Kill App' },
    softKeyListener: {
      left: function() {
        var menu = [
          {'text': 'Search'},
          {'text': 'Reload Library'},
          {'text': 'Changelogs'},
          {'text': 'Help & Support'},
        ]
        this.$router.showOptionMenu('Menu', menu, 'SELECT', (selected) => {
          if (selected.text === 'Reload Library') {
            this.verticalNavIndex = -1;
            if (window['__DS__']) {
              window['__DS__'].destroy();
            }
            window['__DS__'] = new DataStorage(this.methods.onChange, this.methods.onReady);
          } else if (selected.text === 'Help & Support') {
            this.$router.push('helpSupportPage');
          } else if (selected.text === 'Changelogs') {
            this.$router.push('changelogs');
          } else if (selected.text === 'Search') {
            const searchDialog = Kai.createDialog('Search', '<div><input id="search-input" placeholder="Enter your keyword" class="kui-input" type="text" /></div>', null, '', undefined, '', undefined, '', undefined, undefined, this.$router);
            searchDialog.mounted = () => {
              setTimeout(() => {
                setTimeout(() => {
                  this.$router.setSoftKeyText('Cancel' , '', 'Go');
                }, 103);
                const SEARCH_INPUT = document.getElementById('search-input');
                if (!SEARCH_INPUT) {
                  return;
                }
                SEARCH_INPUT.focus();
                SEARCH_INPUT.addEventListener('keydown', (evt) => {
                  switch (evt.key) {
                    case 'Backspace':
                    case 'EndCall':
                      if (document.activeElement.value.length === 0) {
                        this.$router.hideBottomSheet();
                        setTimeout(() => {
                          SEARCH_INPUT.blur();
                        }, 100);
                      }
                      break
                    case 'SoftRight':
                      this.$router.hideBottomSheet();
                      setTimeout(() => {
                        SEARCH_INPUT.blur();
                        this.methods.search(SEARCH_INPUT.value);
                      }, 100);
                      break
                    case 'SoftLeft':
                      this.$router.hideBottomSheet();
                      setTimeout(() => {
                        SEARCH_INPUT.blur();
                      }, 100);
                      break
                  }
                });
              });
            }
            searchDialog.dPadNavListener = {
              arrowUp: function() {
                const SEARCH_INPUT = document.getElementById('search-input');
                SEARCH_INPUT.focus();
              },
              arrowDown: function() {
                const SEARCH_INPUT = document.getElementById('search-input');
                SEARCH_INPUT.focus();
              }
            }
            this.$router.showBottomSheet(searchDialog);
          }
        }, null);
      },
      center: function() {
        var file = this.data.files[this.verticalNavIndex];
        if (file) {
          var DS;
          if (window['__DS__']) {
            DS = window['__DS__'];
          }
          else {
            DS = new DataStorage(() => {}, () => {}, false);
          }
          DS.getFile(file.path, (blob) => {
            editor(this.$router, blob);
            // execute(this.$router, blob);
          }, (err) => {
            this.$router.showToast(err.toString());
          })
        }
      },
      right: function() {
        window.close();
      }
    },
    dPadNavListener: {
      arrowUp: function() {
        this.navigateListNav(-1);
      },
      arrowRight: function() {
        //this.navigateTabNav(-1);
      },
      arrowDown: function() {
        this.navigateListNav(1);
      },
      arrowLeft: function() {
        //this.navigateTabNav(1);
      },
    },
    backKeyListener: function() {}
  });

  const router = new KaiRouter({
    title: 'K-Video Player',
    routes: {
      'index' : {
        name: 'homepage',
        component: homepage
      },
      'helpSupportPage': {
        name: 'helpSupportPage',
        component: helpSupportPage
      },
      'changelogs': {
        name: 'changelogs',
        component: changelogs
      },
    }
  });

  const app = new Kai({
    name: '_APP_',
    data: {},
    templateUrl: document.location.origin + '/templates/template.html',
    mounted: function() {},
    unmounted: function() {},
    router,
    state
  });

  try {
    app.mount('app');
  } catch(e) {
    console.log(e);
  }

  function displayKaiAds() {
    var display = true;
    if (window['kaiadstimer'] == null) {
      window['kaiadstimer'] = new Date();
    } else {
      var now = new Date();
      if ((now - window['kaiadstimer']) < 300000) {
        display = false;
      } else {
        window['kaiadstimer'] = now;
      }
    }
    console.log('Display Ads:', display);
    if (!display)
      return;
    getKaiAd({
      publisher: 'ac3140f7-08d6-46d9-aa6f-d861720fba66',
      app: 'html5-editor',
      slot: 'kaios',
      onerror: err => console.error(err),
      onready: ad => {
        ad.call('display')
        ad.on('close', () => {
          app.$router.hideBottomSheet();
          document.body.style.position = '';
        });
        ad.on('display', () => {
          app.$router.hideBottomSheet();
          document.body.style.position = '';
        });
      }
    })
  }

  displayKaiAds();

  var EXIT_STACK = 0;
  document.addEventListener('keydown', (evt) => {
    if (evt.key === 'Call') {
      if (window['exittimer'])
        clearTimeout(window['exittimer']);
      EXIT_STACK += 1;
      if (EXIT_STACK === 3)
        window.close();
      window['exittimer'] = setTimeout(() => {
        EXIT_STACK = 0;
        window['exittimer'] = null;
      }, 300);
    }
  });

  document.addEventListener('visibilitychange', function(ev) {
    if (document.visibilityState === 'visible') {
      displayKaiAds();
    }
  });

});
