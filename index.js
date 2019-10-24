/*
* IoT Hub Philips Hue NodeJS - Microsoft Sample Code - Copyright (c) 2018 - Licensed MIT
*/
'use strict';

const phidget22 = require('phidget22');

const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;

// DPS and connection stuff

const iotHubTransport = require('azure-iot-device-mqtt').Mqtt;

var ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').Mqtt;
var SymmetricKeySecurityClient = require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient;
var ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

var provisioningHost = 'global.azure-devices-provisioning.net';

const DEFAULT_SERVER_PORT = 5661;
const DEFAULT_HOST_NAME = "localhost";
const DEFAULT_PASSWORD = "";

var client;
var config;
var connect;

var sendingMessage = true;

var phidgetsConnection;

var lcd;
var humidity;
var temperature;
var motion;
var light;

var humidityValue;
var temperatureValue;
var motionState = false;
var previousMotionState = false;

var lightValue;

var motionStates = [0,0,0,0,0,0,0,0,0,0];
var motionIndex = 0;

var lastMotionNotification = new Date(1970,0,1);

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

	light = new phidget22.VoltageInput();
	light.setChannel(2);

	motion = new phidget22.VoltageRatioInput();
	motion.setChannel(3);

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

	light.onAttach = function (ch) {
		console.log(ch + ' attached');
	};

	light.onDetach = function (ch) {
		console.log(ch + ' detached');
	};

	light.onVoltageChange = function (value, unit) {
		lightValue = 200 * value;
	};

	motion.onAttach = function (ch) {
		console.log(ch + ' attached');
	};

	motion.onDetach = function (ch) {
		console.log(ch + ' detached');
	};

	motion.onVoltageRatioChange = function (value, unit) {
		var adjustedValue = 0.500 - value;
		var currentState;

		if(adjustedValue > 0.06 || adjustedValue < -0.06) {
			currentState = 1;
		}
		else {
			currentState = 0;
		}

		motionStates[motionIndex] = currentState;

		motionIndex = (motionIndex + 1) % 10;

		var i;

		var hits = 0;

		for(i=0;i<10;i++) {
			hits += motionStates[i];
		}
	
		motionState = (hits > 5);

		if(motionState != previousMotionState) {
			previousMotionState = motionState;

			if(motionState) {
				console.log("Motion Detected");
				
				var now = new Date();

				var timeSinceLastNotification = now.getTime() - lastMotionNotification.getTime();

				console.log("Time Since Last Notification was " + timeSinceLastNotification);

				if(timeSinceLastNotification >= config.motionNotificationDeadband) {
					console.log("Sending notification...");

					lastMotionNotification = now;

					var payload = {};

					payload["motion"] = "Motion Detected";
		
					updateInputStatus(payload);
				}
			}
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

	light.open().then(function (ch) {
		console.log('channel open');
	}).catch(function (err) {
		console.log('failed to open the channel:' + err);
	});

	motion.open().then(function (ch) {
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

function updateInputStatus(inputs) {
	if (!sendingMessage) { return; }
  
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
  
function initBindings() {
	// set C2D and device method callback

	client.onDeviceMethod('start', onStart);
	client.onDeviceMethod('stop', onStop);

	client.on('message', onReceiveMessage);

	// Initialize method callback
	
	client.onDeviceMethod('WriteLCD', onWriteLCD);

}

function initLogic() {
	connectToPhidgetsServer(connect.phidgetsHostName,connect.phidgetsPort,connect.phidgetsPassword);

	setInterval(() => {
		var payload = {};

		payload["temperature"] = temperatureValue;
		payload["humidity"] = humidityValue;
		payload["light"] = lightValue;

		updateInputStatus(payload);
	}, config.interval);
}

function initDevice() {

}

function initClient() {

	// Start the device (connect it to Azure IoT Central).
	try {

		var provisioningSecurityClient = new SymmetricKeySecurityClient(connect.deviceId, connect.symmetricKey);
		var provisioningClient = ProvisioningDeviceClient.create(provisioningHost, connect.idScope, new ProvisioningTransport(), provisioningSecurityClient);

		provisioningClient.register((err, result) => {
			if (err) {
				console.log('error registering device: ' + err);
			} else {
				console.log('registration succeeded');
				console.log('assigned hub=' + result.assignedHub);
				console.log('deviceId=' + result.deviceId);

				var connectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + connect.symmetricKey;
				client = Client.fromConnectionString(connectionString, iotHubTransport);
			
				client.open((err) => {
					if (err) {
						console.error('[IoT hub Client] Connect error: ' + err.message);
						return;
					}
					else {
						console.log('[IoT hub Client] Connected Successfully');
					}
			
					initBindings();

					initLogic();
				});
			}
		});
	}
	catch(err) {
		console.log(err);
	}
}

// Read in configuration from config.json

try {
	config = require('./config.json');
} catch (err) {
	config = {};
	console.error('Failed to load config.json: ' + err.message);
	return;
}

// Read in connection details from connect.json

try {
	connect = require('./connect.json');
} catch (err) {
	connect = {};
	console.error('Failed to load connect.json: ' + err.message);
	return;
}

// Perform any device initialization

initDevice();

// Initialize Azure IoT Client

initClient();
