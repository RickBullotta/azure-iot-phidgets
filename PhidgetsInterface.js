var phidget22 = require('phidget22');

var SERVER_PORT = 5661;

function main() {

	var hostname = 'localhost';

	console.log('connecting to:' + hostname);
	var conn = new phidget22.Connection(SERVER_PORT, hostname, { name: 'Server Connection', passwd: '' });
	conn.connect()
		.then(runExample)
		.catch(function (err) {
			console.error('Error running example:', err.message);
			process.exit(1);
		});
}

function runExample() {

	console.log('connected to server');
	var lcd = new phidget22.LCD();

	var humidity = new phidget22.VoltageRatioInput();
	humidity.setChannel(0);

	var temperature = new phidget22.VoltageRatioInput();
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
		lcd.writeText(phidget22.LCDFont.DIMENSIONS_5X8, 0, 0, "Washer : ???");
		lcd.writeText(phidget22.LCDFont.DIMENSIONS_5X8, 0, 1, "temperature  : ???");
		lcd.flush();
	};

	humidity.onAttach = function (ch) {
		console.log(ch + ' attached');
	};

	humidity.onDetach = function (ch) {
		console.log(ch + ' detached');
	};

	humidity.onSensorChange = function (value, unit) {
		lcd.writeText(phidget22.LCDFont.DIMENSIONS_5X8, 0, 0, "Humidity : " + value);
		lcd.flush();
	};

	temperature.onAttach = function (ch) {
		console.log(ch + ' attached');
	};

	temperature.onDetach = function (ch) {
		console.log(ch + ' detached');
	};

	temperature.onSensorChange = function (value, unit) {
		lcd.writeText(phidget22.LCDFont.DIMENSIONS_5X8, 0, 1, "Temperature  : " + value);
		lcd.flush();
	};

	try {
		config = require('./config.json');

	}
	catch (err) {
		console.error('Failed to load config.json: ' + err.message);
	}

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


if (require.main === module)
	main();
