/*
* IoT Hub Philips Hue NodeJS - Microsoft Sample Code - Copyright (c) 2018 - Licensed MIT
*/
'use strict';

const phidget22 = require('phidget22');

const fs = require('fs');
const path = require('path');

const Client = require('azure-iot-device').Client;
const ConnectionString = require('azure-iot-device').ConnectionString;
const Message = require('azure-iot-device').Message;
const Protocol = require('azure-iot-device-mqtt').Mqtt;

const DEFAULT_SERVER_PORT = 5661;
const DEFAULT_HOST_NAME = "localhost";
const DEFAULT_PASSWORD = "";

var messageId = 0;
var deviceId;
var client;
var config;

var sendingMessage = true;

var phidgetsConnection;

var lcd;
var humidity;
var temperature;
var humidityValue;
var temperatureValue;

function connectToPhidgetsServer(hostname, port, password) {

	console.log('Connecting to Phidgets Server at:' + hostname);

	if(hostname == undefined || hostname == null) {
		hostname = DEFAULT_HOST_NAME;
	}

	if(password == undefined || password == null) {
		password = DEFAULT_PASSWORD;
	}

	if(port == undefined || port == null) {
		port = DEFAULT_SERVER_PORT;
	}
	
	phidgetsConnection = new phidget22.Connection(port, hostname, { name: 'Server Connection', passwd: password });
	phidgetsConnection.connect()
		.then(initializePhidgets)
		.catch(function (err) {
			console.error('Unable To Connect To Phidgets Server:', err.message);
			process.exit(1);
		});
}

function initializePhidgets() {
	console.log('Connected to Phidgets server...');

	lcd = new phidget22.LCD();

	humidity = new phidget22.VoltageRatioInput();
	humidity.setChannel(0);

	temperature = new phidget22.VoltageRatioInput();
	temperature.setChannel(1);

	lcd.onDetach = function (lcd) {
		console.log(lcd + ' detached');
	};

	lcd.onAttach = function (lcd) {
		console.log(lcd + ' attached');
		if (lcd.getDeviceID() === phidget22.DeviceID.PN_1204) {
			lcd.setScreenSize(phidget22.LCDScreenSize.DIMENSIONS_2X40);
		}

		lcd.setBacklight(1);

		if(config.displaySensorValues) {
			lcd.writeText(phidget22.LCDFont.DIMENSIONS_5X8, 0, 0, "Humidity : ???");
			lcd.writeText(phidget22.LCDFont.DIMENSIONS_5X8, 0, 1, "Temperature  : ???");
			lcd.flush();
		}
	};

	humidity.onAttach = function (ch) {
		console.log(ch + ' attached');
	};

	humidity.onDetach = function (ch) {
		console.log(ch + ' detached');
	};

	humidity.onSensorChange = function (value, unit) {
		humidityValue = value;
		
		if(config.displaySensorValues) {
			lcd.writeText(phidget22.LCDFont.DIMENSIONS_5X8, 0, 0, "Humidity : " + value);
			lcd.flush();
		}
	};

	temperature.onAttach = function (ch) {
		console.log(ch + ' attached');
	};

	temperature.onDetach = function (ch) {
		console.log(ch + ' detached');
	};

	temperature.onSensorChange = function (value, unit) {
		temperatureValue = value;

		if(config.displaySensorValues) {
			lcd.writeText(phidget22.LCDFont.DIMENSIONS_5X8, 0, 1, "Temperature  : " + value);
			lcd.flush();
		}
	};

	lcd.open().then(function (lcd) {
		console.log('channel open');
	}).catch(function (err) {
		console.log('failed to open the channel:' + err);
	});

	humidity.open().then(function (ch) {
		console.log('channel open');
		humidity.setSensorType(phidget22.VoltageRatioSensorType.PN_1125_HUMIDITY);
	}).catch(function (err) {
		console.log('failed to open the channel:' + err);
	});

	temperature.open().then(function (ch) {
		temperature.setSensorType(phidget22.VoltageRatioSensorType.PN_1125_TEMPERATURE);
		console.log('channel open');
	}).catch(function (err) {
		console.log('failed to open the channel:' + err);
	});
}

function convertPayload(request) {
	if(typeof(request.payload) == "string") {
		try {
			request.payload = JSON.parse(request.payload);
		}
		catch(e) {

		}
	}
}

function onWriteLCD(request, response) {
	sendingMessage = true;

	convertPayload(request);

	var line = request.payload.line;
	var text = request.payload.text;

	if (config.infoMethods)
		console.info("WriteLCD : line = " + line);

	if (line !== undefined && line >= 1 && line <= 2) {
		try {
			lcd.writeText(phidget22.LCDFont.DIMENSIONS_5X8, 0, (line-1), text);
			lcd.flush();

			response.send(200, 'Successfully Wrote LCD line ' + line, function (err) {
				if (err) {
					console.error('Unable to respond to WriteLCD method request');
				}
			});
		}
		catch(eWriteLCD) {
			response.send(400, 'Unable to write LCD : ' + eWriteLCD, function (err) {
				if (err) {
					console.error('Unable to respond to WriteLCD method request');
				}
			});
		}
	}
	else {
		response.send(400, 'Invalid line', function (err) {
			if (err) {
				console.error('Unable to respond to WriteLCD method request');
			}
		});
	}
}

function onStart(request, response) {
	if (config.infoMethods)
		console.info('Try to invoke method start(' + request.payload || '' + ')');

	sendingMessage = true;

	convertPayload(request);
	
	response.send(200, 'Successully start sending message to cloud', function (err) {
		if (err) {
			console.error('[IoT hub Client] Failed sending a method response:\n' + err.message);
		}
	});
}

function onStop(request, response) {
	if (config.infoMethods)
		console.info('Try to invoke method stop(' + request.payload || '' + ')')

	sendingMessage = false;

	convertPayload(request);
	
	response.send(200, 'Successully stop sending message to cloud', function (err) {
		if (err) {
			console.error('[IoT hub Client] Failed sending a method response:\n' + err.message);
		}
	});
}

function onReceiveMessage(msg) {
	var message = msg.getData().toString('utf-8');

	client.complete(msg, () => {
		if (config.infoInboundMessages)
			console.info('Incoming Message Received');

		if (config.debugInboundMessages)
			console.debug(message);
	});
}

function initClient(connectionStringParam, credentialPath) {
	var connectionString = ConnectionString.parse(connectionStringParam);
	deviceId = connectionString.DeviceId;

	// fromConnectionString must specify a transport constructor, coming from any transport package.
	client = Client.fromConnectionString(connectionStringParam, Protocol);

	// Configure the client to use X509 authentication if required by the connection string.
	if (connectionString.x509) {
		// Read X.509 certificate and private key.
		// These files should be in the current folder and use the following naming convention:
		// [device name]-cert.pem and [device name]-key.pem, example: myraspberrypi-cert.pem
		var connectionOptions = {
			cert: fs.readFileSync(path.join(credentialPath, deviceId + '-cert.pem')).toString(),
			key: fs.readFileSync(path.join(credentialPath, deviceId + '-key.pem')).toString()
		};

		client.setOptions(connectionOptions);

		console.debug('[Device] Using X.509 client certificate authentication');
	}
	return client;
}

function updateInputStatus(inputs) {
	if (!sendingMessage) { return; }
  
	var content = {
	  messageId: ++messageId,
	  deviceId: deviceId
	};
  
	var rawMessage = JSON.stringify(inputs);
  
	console.log("Sending:");
	console.log(rawMessage);
  
	var message = new Message(rawMessage);
  
	if (config.infoOutboundMessages)
	  console.info('Sending Input Status Update to Azure IoT Hub');
  
	if (config.debugOutboundMessages)
	  console.debug(rawMessage);
  
	client.sendEvent(message, (err) => {
	  if (err) {
		console.error('Failed to send message to Azure IoT Hub');
	  } else {
		if (config.infoOutboundMessages)
		  console.info('Message sent to Azure IoT Hub');
	  }
	});
}
  
  
(function (connectionString) {

	// create a client
	// read out the connectionString from process environment
	connectionString = connectionString || process.env['AzureIoTHubDeviceConnectionString'];
	client = initClient(connectionString, config);

	client.open((err) => {
		if (err) {
			console.error('[IoT hub Client] Connect error: ' + err.message);
			return;
		}
		else {
			console.log('[IoT hub Client] Connected Successfully');
		}

		// set C2D and device method callback
		client.onDeviceMethod('start', onStart);
		client.onDeviceMethod('stop', onStop);

		client.onDeviceMethod('WriteLCD', onWriteLCD);

		client.on('message', onReceiveMessage);

		try {
			config = require('./config.json');
		}
		catch (err) {
			config = {};
			console.error('Failed to load config.json: ' + err.message);
		}
	

		connectToPhidgetsServer(config.phidgetsHostName,config.phidgetsPort,config.phidgetsPassword);

		setInterval(() => {
			var payload = {};

			payload["temperature"] = temperatureValue;
			payload["humidity"] = humidityValue;

			updateInputStatus(payload);
		}, config.interval);

	});
})(process.argv[2]);
