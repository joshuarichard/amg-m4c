/* eslint-env browser */
/* eslint no-undef: 0 */

$(document).ready(function() {
    // firstly, set a donor id if the user isn't logged in. this will be used to
    // manage their cart and lock children as they add them to the cart.
    // if the donor is not logged in and currently doesn't have an assigned donor id then assign them one

    /* If there is a login token in session storage
     * then the form should be auto-populated with
     * the donors information
     */
    if (inStorage('token') === true) {
        $.ajax({
            url: '/api/v1/donor/id/' + sessionStorage.getItem('id'),
            type: 'POST',
            data: {
                'token' : sessionStorage.getItem('token')
            },
            success: function(res) {
                $('#form-first-name').val(res.nombre);
                $('#form-first-name').prop('disabled', true);
                $('#form-last-name').val(res.apellido);
                $('#form-last-name').prop('disabled', true);
                $('#form-phone').val(res.teléfono);
                $('#form-phone').prop('disabled', true);
                $('#form-address-street').val(res.calle);
                $('#form-address-street').prop('disabled', true);
                $('#form-address-city').val(res.ciudad);
                $('#form-address-city').prop('disabled', true);
                $('#form-email').val(res.correo_electrónico);
                $('#form-email').prop('disabled', true);
                $('#form-country').prop('disabled', true);
            },
            error: function() {
                if (jqxhr.readyState !== 0 || jqxhr.status !== 0) {
                    alert('La sesión ha expirado, por favor ingrese de nuevo');
                    // if getting in here that means that the id and token has
                    // been set but it's since expired. nuke everything and
                    // make them login again.
                    if (inStorage('token') === true) {
                        sessionStorage.removeItem('token');
                    }
                    if (inStorage('cart') === true) {
                        sessionStorage.removeItem('cart');
                    }
                    if (inStorage('id') === true) {
                        sessionStorage.removeItem('id');
                    }
                    window.location = 'children.html';
                }
            }
        });
    }

    // secondly, check the lock status of all children currently in the cart.
    // if the child is locked, remove the child and alert the donor accordingly
    if (inStorage('cart') === true) {
        var cartArray = sessionStorage.getItem('cart').split(',');

        // check the locked status of every child in the cart. lockedChildren is
        // an array of all children that were in the cart that are locked
        checkCartsLockedStatus(cartArray, function(lockedChildren) {
            if (lockedChildren.length > 0) {
                for (var q = 0; q < lockedChildren.length; q++) {
                    // ... then remove it from the table
                    removeChildFromCart(lockedChildren[q]);
                }
                alert('lo sentimos, pero algunos de los niños en su carrito ya no están disponibles para el patrocinio.');
            }
        });
    }

    // fourthly, begin creating the UI and make some api calls to get child
    // and donor data.
    var container = document.getElementById('children-to-sponsor');
    var table = document.createElement('table');
    table.className = 'table table-hover child-selections';
    var tbody = document.createElement('tbody');

    // fifthly, insert all children in session storage into the cart.
    // if no children in the cart, the remove the spinner
    if (inStorage('cart') === true) {
        var ids = sessionStorage.getItem('cart').split(',');
        for (var i = 0; i < ids.length; i++) {
            addChildToCart(ids[i]);
            container.appendChild(table);
        }
    } else {
        $('.spinner').remove();
    }

    // lastly, check to see if the donor has a cart and if they do then
    // add any kids in that cart
    if (inStorage('id') === true) {
        $.ajax({
            url: '/api/v1/donor/cart/id/' + sessionStorage.getItem('id'),
            type: 'GET',
            success: function(res) {
                if (JSON.stringify(res) !== '{}') {
                    var kidsInCartInDB = [];
                    if (inStorage('cart')) {
                        var kidsInCartOnPage = sessionStorage.getItem('cart').split(',');
                        for (var key in res) {
                            kidsInCartInDB = res[key]['kids_in_cart'];
                            for (var c = 0; c < kidsInCartInDB.length; c++) {
                                if (kidsInCartOnPage.indexOf(kidsInCartInDB[c]) === -1) {
                                    kidsInCartOnPage.push(kidsInCartInDB[c]);
                                    addChildToCart(kidsInCartInDB[c]);
                                }
                            }
                            sessionStorage.setItem('cart', kidsInCartOnPage.toString());
                        }
                    } else {
                        for (key in res) {
                            kidsInCartInDB = res[key]['kids_in_cart'];
                            for (var s = 0; s < kidsInCartInDB.length; s++) {
                                addChildToCart(kidsInCartInDB[c]);
                            }
                            sessionStorage.setItem('cart', kidsInCartInDB.toString());
                        }
                    }

                }
            }
        });
    }

    // after all that append the 'add a child' button
    var addButton = document.createElement('button');
    addButton.className = 'btn btn-primary btn-md';
    addButton.onclick = function() {
        window.location = 'children.html';
    };

    addButton.appendChild(document.createTextNode('Apadrinar a otro niño/a'));
    container.appendChild(addButton);

    /* if the user is already logged in, change the login button
     * to a go to account page link, else create login overlay
     */
    if (inStorage('token') === true) {
        document.getElementById('toggle-login').href = 'account.html';
        document.getElementById('toggle-login').innerHTML = 'Mi Cuenta';
        $('#edit-donor-info').show();
    } else {
        /* When login link is clicked, call toggleLogin */
        $('#toggle-login').click(toggleLogin);

        /* When the log in button is clicked, validate credentials
           and if valid send the user to account.html and but the
           token returned by server into session storage */
        $('.login-submit').click(function(event) {
            event.preventDefault();
            var worked = false;
            var email = $('.donor-email').val();
            var password = $('.donor-password').val();

            // define the request
            $.ajax({
                url: '/api/v1/donor/auth',
                type: 'POST',
                data: {
                    'email': email,
                    'password': password
                },
                // on successful login, save token and donor id
                // in session storage and go to the donor portal
                success: function(res) {
                    //save login token to session storage
                    sessionStorage.setItem('token', res.token);
                    sessionStorage.setItem('id', res.id);
                    worked = true;
                },
                error: function(httpObj) {
                    if(httpObj.status === 401) {
                        alert('correo o contraseña incorrectos.');
                    } else {
                        console.log(JSON.stringify(httpObj));
                        alert('see console for error info.');
                    }
                    worked = false;
                },
                complete: function() {
                    if (worked === true) {
                        window.location = 'account.html';
                    }
                }
            });
        });
    }

    // checks the status of all kids in the cart. takes the cart from sessionStorage
    // as an array, not a string.
    function checkCartsLockedStatus(array, callback) {
        array = array.slice(0);
        var lockedChildren = [];

        function checkForLockedStatus() {
            var childID = array.pop();

            var donorIDjson = {};
            if (inStorage('id') === true) {
                donorIDjson = {
                    'donor_id': sessionStorage.getItem('id')
                };
            }

            $.ajax({
                url: '/api/v1/children/islocked/id/' + childID,
                type: 'POST',
                data: donorIDjson,
                success: function(res) {
                    if (res.islocked === true) {
                        lockedChildren.push(childID);
                    }
                    if(array.length > 0) {
                        checkForLockedStatus();
                    } else {
                        callback(lockedChildren);
                    }
                }
            });
        }

        if(array.length > 0) {
            checkForLockedStatus();
        } else {
            callback(lockedChildren);
        }
    }

    function sendCart(requestToPay, callback) {
        console.log('sending cart');
        var donorIDinCart = '';
        // if the donor is logged in then use their donor id in the cart doc
        if (inStorage('id') === true && inStorage('cart') === true) {
            donorIDinCart = sessionStorage.getItem('id');
        }

        $.ajax({
            url: '/api/v1/donor/cart',
            type: 'POST',
            data: {
                'donor_id' : donorIDinCart,
                'kids_in_cart' : sessionStorage.getItem('cart').split(','),
                'request_to_pay': requestToPay
            },
            success: function() {
                callback(true);
            },
            error: function() {
                callback(false);
            }
        });
    }

    function addChildToCart(id) {
        // create child's table row
        var tr = document.createElement('tr');

        function pic(callback) {
            var picTD = document.createElement('td');
            var picIMG = document.createElement('img');
            picIMG.className = 'child-img';

            $.getJSON('/api/v1/pictures/id/' + id, function(res) {
                if (res.data.hasOwnProperty('err')){
                    console.log(res.data.err);
                    callback(false);
                } else if (res.data !== undefined) {
                    picIMG.src = 'data:image/image;base64,' + res.data;
                    picTD.appendChild(picIMG);
                    tr.appendChild(picTD);
                    callback(true);
                }
            });
        }

        function data(callback) {
            // get child data using api
            $.getJSON('/api/v1/children/id/' + id, function(res) {
                if(res.hasOwnProperty('err')) {
                    console.log(JSON.stringify(data));
                    callback(false);
                } else {
                    var dataTD = document.createElement('td');
                    tr.id = id;

                    // set up all child info as vars
                    var monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril',
                                      'Mayo', 'Junio', 'Julio', 'Agosto',
                                      'Septiembre', 'Octubre', 'Noviembre',
                                      'Diciembre'];
                    var date = new Date(res[id].cumpleaños);
                    var birthday = monthNames[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
                    var name = res[id].nombre;
                    var birthdayISO = new Date(res[id].cumpleaños);
                    var ageUncorrected = 2016 - birthdayISO.getFullYear();
                    var ageCorrected = ageUncorrected; // temporary NOT ALWAYS CORRECT <-----------------==============-------------------
                    var gender = res[id].género;
                    var departamento = res[id].departamento;
                    var center = res[id].centro_de_ninos;
                    var hobbies = res[id].pastiempos;
                    var picture = res[id].foto;

                    var picTD = document.createElement('td');
                    var picIMG = document.createElement('img');
                    picIMG.className = 'child-img';
                    picIMG.src = 'data:image/image;base64,' + picture;
                    picTD.appendChild(picIMG);
                    tr.appendChild(picTD);

                    // create elements for each piece of info
                    var dataDiv = document.createElement('td');
                    dataDiv.className = 'child-info-group';

                    var nameDiv = document.createElement('div');
                    var ageDiv = document.createElement('div');
                    var birthdayDiv = document.createElement('div');
                    var genderDiv = document.createElement('div');
                    var departamentoDiv = document.createElement('div');
                    var centerDiv = document.createElement('div');
                    var hobbiesDiv = document.createElement('div');

                    // assign classes to those elements
                    nameDiv.className = 'child-info';
                    ageDiv.className = 'child-info';
                    birthdayDiv.className = 'child-info';
                    genderDiv.className = 'child-info';
                    departamentoDiv.className = 'child-info';
                    centerDiv.className = 'child-info';
                    hobbiesDiv.className = 'child-info';

                    // assign values
                    nameDiv.innerHTML = '<b> Nombre: </b>' + name;
                    ageDiv.innerHTML = '<b> Años:  </b>' + ageCorrected;
                    birthdayDiv.innerHTML = '<b> Cumpleaños:  </b>' + birthday;
                    genderDiv.innerHTML = '<b> Género:  </b>' + gender;
                    departamentoDiv.innerHTML = '<b> Departamento: </b>' + departamento;
                    centerDiv.innerHTML = '<b> Centro/Colegio:  </b>' + center;
                    hobbiesDiv.innerHTML = '<b> Pastiempos: </b>' + hobbies;

                    // append children to div
                    dataTD.appendChild(nameDiv);
                    dataTD.appendChild(ageDiv);
                    dataTD.appendChild(birthdayDiv);
                    dataTD.appendChild(genderDiv);
                    dataTD.appendChild(departamentoDiv);
                    dataTD.appendChild(centerDiv);
                    dataTD.appendChild(hobbiesDiv);

                    // append dataTD to the dataDiv for styling, then append to row
                    dataDiv.appendChild(dataTD);
                    tr.appendChild(dataDiv);

                    callback(true);
                    $('.spinner').remove();
                }
            });
        }

        function deleteButton(callback) {
            var buttonTD = document.createElement('td');

            // create button, add classname for styling, append text
            var button = document.createElement('button');
            button.className = 'btn btn-primary btn-sm delete-child-button';
            button.appendChild(document.createTextNode('Eliminar'));

            // set on click button function
            button.onclick = function() {
                removeChildFromCart(button.parentNode.parentNode.id);
            };

            // add button to table entry and add table entry to row
            buttonTD.appendChild(button);
            tr.appendChild(buttonTD);

            callback(true);
        }

        // first insert pic
        /*
        pic(function(success) {
            if(success === true) {
                // then append data
                */
                data(function(success)  {
                    if(success === true) {
                        // then append delete button
                        deleteButton(function() {
                            // append the row to the tbody, and
                            // add the tbody to the table
                            tbody.appendChild(tr);
                            table.appendChild(tbody);
                        });
                    }
                });
                /*
            }
        });
        */
    }

    function removeChildFromCart(id) {
        // if the table entry hasn't already been deleted then delete it now
        // but wait for it using arrive.js if it's not there yet
        $(document).arrive('[id=\'' + id + '\']', {onceOnly: true, existing: true}, function() {
            $(this).remove();

            // remove child from sessionStorage
            var ids = sessionStorage.getItem('cart').split(',');
            if (ids.indexOf(id) != -1) {
                ids.splice(ids.indexOf(id), 1);
                sessionStorage.setItem('cart', ids.toString());
            }
        });
    }

    var editInfoClicked = false;
    $('#edit-donor-info').click(function() {
        $('#form-first-name').prop('disabled', false);
        $('#form-last-name').prop('disabled', false);
        $('#form-phone').prop('disabled', false);
        $('#form-address-street').prop('disabled', false);
        $('#form-address-city').prop('disabled', false);
        $('#form-country').prop('disabled', false);

        editInfoClicked = true;
    });

    $('#go-to-step-two').click(goToStepTwo);

    function goToStepOne() {
        // show change info button
        $('#donor-info-form').show();
        $('#edit-donor-info').show();
        $('#go-to-step-two').show();
        $('.delete-child-button').show();
        $('#donor-credit-form').hide();
        $('#go-to-step-three').hide();
        $('#go-back-to-step-one').hide();

        // disable form if logged in
        if (inStorage('token') === true && inStorage('id') === true) {
            $('#form-first-name').prop('disabled', true);
            $('#form-last-name').prop('disabled', true);
            $('#form-phone').prop('disabled', true);
            $('#form-address-street').prop('disabled', true);
            $('#form-address-city').prop('disabled', true);
            $('#form-email').prop('disabled', true);
            $('#form-country').prop('disabled', true);
        }
    }

    function goToStepTwo() {
        if (checkForm(document.getElementById('donor-info'))) {
            if (inStorage('cart') === false) {
                alert('No hay niños seleccionados en la carreta.');
            } else {
                // donor is currently logged in so auth (PUT donor data if edited info) and send cart
                if (inStorage('token') === true && inStorage('id') === true) {
                    $.ajax({
                        url: '/api/v1/donor/auth',
                        type: 'POST',
                        data: {
                            'email': document.getElementById('form-email').value,
                            'password': document.getElementById('form-password').value
                        },
                        success: function() {
                            if (editInfoClicked === true) {
                                $.ajax({
                                    url: '/api/v1/donor/id/' + sessionStorage.getItem('id'),
                                    type: 'PUT',
                                    data: {
                                        'token' : sessionStorage.getItem('token'),
                                        'changes' : {
                                            'nombre': document.getElementById('form-first-name').value,
                                            'apellido': document.getElementById('form-last-name').value,
                                            'teléfono': document.getElementById('form-phone').value,
                                            'calle': document.getElementById('form-address-street').value,
                                            'ciudad': document.getElementById('form-address-city').value,
                                            'país': document.getElementById('form-country').value
                                        }
                                    },
                                    success: function() {
                                        editInfoClicked = false;
                                        var cartArray = sessionStorage.getItem('cart').split(',');

                                        // check for locked kids
                                        checkCartsLockedStatus(cartArray, function(lockedChildren) {
                                            if (lockedChildren.length > 0) {
                                                for (var q = 0; q < lockedChildren.length; q++) {
                                                    // ... then remove it from the table
                                                    removeChildFromCart(lockedChildren[q]);
                                                }
                                                alert('lo sentimos, pero algunos de los niños en su carrito ya no están disponibles para el patrocinio.');
                                            } else {
                                                // if there aren't any children that are locked then send the cart
                                                sendCart(false, function() {
                                                    // hide elements from step one and show step two
                                                    // hide change info button
                                                    $('#donor-info-form').hide();
                                                    $('#go-to-step-two').hide();
                                                    $('.delete-child-button').hide();
                                                    $('#edit-donor-info').hide();
                                                    $('#donor-credit-form').show();
                                                    $('#go-to-step-three').show();
                                                    $('#go-back-to-step-one').show();
                                                    $('#go-to-step-three').unbind().click(goToStepThree);
                                                    $('#go-back-to-step-one').unbind().click(goToStepOne);
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                var cartArray = sessionStorage.getItem('cart').split(',');

                                // check for locked kids
                                checkCartsLockedStatus(cartArray, function(lockedChildren) {
                                    if (lockedChildren.length > 0) {
                                        for (var q = 0; q < lockedChildren.length; q++) {
                                            // ... then remove it from the table
                                            removeChildFromCart(lockedChildren[q]);
                                        }
                                        alert('Lo sentimos, pero algunos de los niños seleccionados ya no estan disponibles para ser apadrinados.');
                                    } else {
                                        // if there aren't any children that are locked then send the cart
                                        sendCart(false, function() {
                                            // hide elements from step one and show step two
                                            // hide change info button
                                            $('#donor-info-form').hide();
                                            $('#go-to-step-two').hide();
                                            $('.delete-child-button').hide();
                                            $('#edit-donor-info').hide();
                                            $('#donor-credit-form').show();
                                            $('#go-to-step-three').show();
                                            $('#go-back-to-step-one').show();
                                            $('#go-to-step-three').unbind().click(goToStepThree);
                                            $('#go-back-to-step-one').unbind().click(goToStepOne);
                                        });
                                    }
                                });
                            }
                        }
                    });
                } else {
                    var newDonor = {
                        'nombre': document.getElementById('form-first-name').value,
                        'apellido': document.getElementById('form-last-name').value,
                        'teléfono': document.getElementById('form-phone').value,
                        'calle': document.getElementById('form-address-street').value,
                        'ciudad': document.getElementById('form-address-city').value,
                        'país': document.getElementById('form-country').value,
                        'correo_electrónico': document.getElementById('form-email').value,
                        'password': document.getElementById('form-password').value
                    };

                    $.ajax({
                        url: '/api/v1/donor/create',
                        type: 'POST',
                        data: newDonor,
                        success: function() {
                            $.ajax({
                                url: '/api/v1/donor/auth',
                                type: 'POST',
                                data: {
                                    'email': document.getElementById('form-email').value,
                                    'password': document.getElementById('form-password').value
                                },
                                success: function(res) {
                                    //put token and donor id into sessionStorage
                                    sessionStorage.setItem('token', res.token);
                                    sessionStorage.setItem('id', res.id);
                                    //change login button to account button
                                    document.getElementById('toggle-login').href = 'account.html';
                                    document.getElementById('toggle-login').innerHTML = 'Mi Cuenta';

                                    var cartArray = sessionStorage.getItem('cart').split(',');

                                    // check for locked kids
                                    checkCartsLockedStatus(cartArray, function(lockedChildren) {
                                        if (lockedChildren.length > 0) {
                                            for (var q = 0; q < lockedChildren.length; q++) {
                                                // ... then remove it from the table
                                                removeChildFromCart(lockedChildren[q]);
                                            }
                                            alert('lo sentimos, pero algunos de los niños en su carrito ya no están disponibles para el patrocinio.');
                                        } else {
                                            // if there aren't any children that are locked then send the cart
                                            sendCart(false, function() {
                                                // hide elements from step one and show step two
                                                // hide change info button
                                                $('#donor-info-form').hide();
                                                $('#go-to-step-two').hide();
                                                $('.delete-child-button').hide();
                                                $('#edit-donor-info').hide();
                                                $('#donor-credit-form').show();
                                                $('#go-to-step-three').show();
                                                $('#go-back-to-step-one').show();
                                                $('#go-to-step-three').unbind().click(goToStepThree);
                                                $('#go-back-to-step-one').unbind().click(goToStepOne);
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
        }
    }

    //confirm sponsorship details before submitting
    function goToStepThree() {
        sessionStorage.setItem('ccnumber', $('#form-credit').val());
        sessionStorage.setItem('cvv', $('#form-cvv').val());
        sessionStorage.setItem('expiration', $('#form-expiration-1').val() + '/' + $('#form-expiration-2').val());

        //hide elements from step two
        $('#donor-credit-form').hide();
        $('#go-back-to-step-one').hide();
        $('#go-to-step-three').hide();
        // change header
        document.getElementById('right-header').innerHTML = 'Confirm Your Information';

        // show elements for step three
        $('#donor-info-confirmation').show();
        $('#go-back-to-step-two').show();
        $('#submit-sponsorship').show();

        // send the cart one final time but this time with the requestToPay = true
        sendCart(true, function() {
            $.ajax({
                url: '/api/v1/donor/id/' + sessionStorage.getItem('id'),
                type: 'POST',
                data: {
                    'token': sessionStorage.getItem('token')
                },
                success: function(res) {
                    $('#donor-name').text(res.nombre);
                    $('#donor-phone').text(res.teléfono);
                    $('#donor-address').text(res.calle + ' ' + res.ciudad + ', ' + res.país);
                    $('#donor-email').text(res.correo_electrónico);
                    $('#donor-credit-card').text(sessionStorage.getItem('ccnumber'));
                    $('#donor-cvv').text(sessionStorage.getItem('cvv'));
                    $('#donor-expiration-date').text(sessionStorage.getItem('expiration'));
                }
            });
        });
    }

    $('#submit-sponsorship').click(sendPayment);

    function sendPayment() {
        if ($('#confirm-payment').prop('checked') === true) {
            var donor = {
                'donor_id': sessionStorage.getItem('id'),
                'token': sessionStorage.getItem('token'),
                'child_id': sessionStorage.getItem('cart').split(','),
                'ccnumber': sessionStorage.getItem('ccnumber'),
                'cvv': sessionStorage.getItem('cvv'),
                'expiration': sessionStorage.getItem('expiration')
            };

            $('#submit-sponsorship').prop('disabled', true);
            $.ajax({
                url: '/api/v1/donor/sponsor',
                type: 'POST',
                data: donor,
                success: function(res) {
                    if (res.success === true) {
                        displaySuccess();
                    }
                },
                error: function() {
                    alert('Había un problema patrocinar a sus hijos. Su tarjeta no fue acusado.');
                    window.location = 'children.html';
                }
            });
        } else {
            alert('Por favor, estar de acuerdo con los término.');
        }
    }

    $('#go-back-to-step-two').click(function() {
        $('#go-back-to-step-two').hide();
        $('#submit-sponsorship').hide();
        $('#donor-info-confirmation').hide();
        document.getElementById('right-header').innerHTML = 'Datos de Facturación';
        goToStepTwo();
    });

    // displays success once the transaction is complete
    function displaySuccess() {
        // empty child _id's from session storage cart
        sessionStorage.removeItem('cart');

        $('#children-to-sponsor').remove();
        $('#donor-info').remove();

        var centerDiv = document.createElement('div');
        var h1Thing = document.createElement('h1');
        var pThing = document.createElement('p');

        centerDiv.className = 'center';
        h1Thing.innerHTML = '¡Muchas gracias!';
        pThing.innerHTML = 'Usted ha cambiado la vida de un niño hoy.';
        h1Thing.appendChild(pThing);
        centerDiv.appendChild(h1Thing);

        $('.content').append(centerDiv);
    }

    // =========================================================================
    // =========================================================================
    // ==================== Deleting the below soon ============================
    // =========================================================================
    // =========================================================================

    /* Toggle the login box when login link is clicked */
    function toggleLogin () {
        if ($('.login').css('display') == 'none') {
            $('.login').show();
        }
        else {
            $('.login').hide();
        }
    }

    function toggleCreateAccount () {
        if ($('.create-account-overlay').css('display') == 'none') {
            $('.create-account-overlay').show();
            $('.login').hide();
        }
        else {
            $('.create-account-overlay').hide();
        }
    }
    $('.create-account').click(toggleCreateAccount);

    function createAccount() {
        if (checkForm(document.getElementById('create-account-form'))) {
            var donor = {
                'nombre': document.getElementById('create-account-first-name').value,
                'apellido': document.getElementById('create-account-last-name').value,
                'teléfono': document.getElementById('create-account-phone').value,
                'calle': document.getElementById('create-account-address-street').value,
                'ciudad': document.getElementById('create-account-address-city').value,
                'país': document.getElementById('create-account-country').value,
                'correo_electrónico': document.getElementById('create-account-email').value,
                'password': document.getElementById('create-account-password').value
            };

            // POST /api/v1/donor/create
            $.ajax({
                url: '/api/v1/donor/create',
                type: 'POST',
                data: donor,
                success: function() {
                    $('.create-account-overlay').hide();
                    //log user into their new account
                    $.ajax({
                        url: '/api/v1/donor/auth',
                        type: 'POST',
                        data: {
                            'correo_electrónico': document.getElementById('create-account-email').value,
                            'password': document.getElementById('create-account-password').value
                        },
                        success: function() {
                            //put token and donor id into sessionStorage
                            sessionStorage.setItem('token', res.token);
                            sessionStorage.setItem('id', res.id);
                            //change login button to account button
                            document.getElementById('toggle-login').href = 'account.html';
                            document.getElementById('toggle-login').innerHTML = 'Mi Cuenta';
                            //notify user they are now logged into their new account
                            alert('Su cuenta ha sido creada exitosamente, su sesión ha iniciado');
                        },
                        error: function() {
                            alert('Su cuenta ha sido creada pero no hemos podido conectarlo ahora, por favor intente de nuevo más tarde');
                        }
                    });
                },
                statusCode: {
                    404: function() {
                        alert('Página no encontrada.');
                    },
                    409: function() {
                        alert('Ya existe un cuenta con la misma dirección de correo. Por favor ingrese.');
                    },
                    500: function() {
                        alert('An error occured, please try again or contact an admin');
                    }
                }
            });
        }
    }

    /* Check to make sure all the fields are filled in and ensure the
     * user's password passes the constraints
     */
    function checkForm(form) {
        // get all form info
        var firstName = $('[name=first-name]', form)[0];
        var lastName = $('[name=last-name]', form)[0];
        var phone = $('[name=phone]', form)[0];
        var street = $('[name=address]', form)[0];
        var city = $('[name=address-city]', form)[0];
        var email = $('[name=email]', form)[0];
        var password = $('[name=password]', form)[0];
        var confirmPassword = $('[name=password-confirm]', form)[0];

        if(firstName.value == '') {
            alert('Error: El primer nombre no puede ir en blanco.');
            firstName.focus();
            return false;
        } else if(lastName.value == '') {
            alert('Error: Apellido no puede ir en blanco.');
            lastName.focus();
            return false;
        } else if(phone.value == '') {
            alert('Error: No. de telefono no debe ir en blanco.');
            phone.focus();
            return false;
        } else if(street.value == '') {
            alert('Error: Calle no puede ir en blanco.');
            street.focus();
            return false;
        } else if(city.value == '') {
            alert('Error: Ciudad no puede ir en blanco.');
            city.focus();
            return false;
        } else if(email.value == '') {
            alert('Error: Correo electrónico no puede ir en blanco.');
            email.focus();
            return false;
        } else if(password.value != '' && password.value == confirmPassword.value) {
            if(password.value.length < 6) {
                alert('Error: La contraseña debe contener al menos 6 carácteres.');
                password.focus();
                return false;
            }
            if(password.value == firstName.value || password.value == lastName.value) {
                alert('Error: La contraseña debe ser diferente a su nombre.');
                password.focus();
                return false;
            }
            re = /[0-9]/;
            if(!re.test(password.value)) {
                alert('Error: La contraseña debe contener al menos un  número (0-9).');
                password.focus();
                return false;
            }
            re = /[a-z]/;
            if(!re.test(password.value)) {
                alert('Error: La contraseña debe contener al menos una letra en minuscula (a-z).');
                password.focus();
                return false;
            }
            re = /[A-Z]/;
            if(!re.test(password.value)) {
                alert('Error: La  contraseña debe contener al menos una letra en mayuscula (A-Z).');
                password.focus();
                return false;
            }
        } else {
            /* eslint-disable */
            alert("Error: Por favor revise que usted haya ingresado y confirme su contraseña.");
            /*eslint-enable */
            password.focus();
            return false;
        }
        //form passed all constraints
        return true;
    }

    // helper function - check session storage element
    function inStorage(object) {
        if (sessionStorage.getItem(object) !== null && sessionStorage.getItem(object) !== '') {
            return true;
        } else {
            return false;
        }
    }

    // =========================================================================
    // =========================================================================

    $('.create-account-submit').click(createAccount);
    $('.close-create-account-overlay').click(toggleCreateAccount);

    $('.forgot-password').click(function() {
        if ($('.donor-email').val() != '' && $('.donor-email').val() != null) {
            // define the request
            $.ajax({
                url: '/api/v1/donor/reset',
                type: 'POST',
                data: {
                    'correo_electrónico': $('.donor-email').val()
                },
                success: function(res) {
                    if (res.status === 200) {
                        alert('Please check your email for your temporary password');
                        toggleLogin();
                    }
                },
                error: function(httpObj) {
                    if(httpObj.status === 401) {
                        alert('correo o contraseña incorrectos.');
                    } else {
                        console.log(JSON.stringify(httpObj));
                        alert('see console for error info.');
                    }
                }
            });
        } else {
            alert('Please enter your email into the email field before clicking Forgot Password');
        }
    });
});
