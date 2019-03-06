---
services: iot-hub, iot-central
platforms: Nodejs
author: rickb
---

# Azure IoT Hub/IoT Central Phidgets Interface

This utilizes the Azure IoT Node.js SDK to connect to the a Phidgets 8/8/8 device with display along with a temperature/humidity sensor.  Note that this connector could easily be adapted to work with virtually any Phidgets device(s).  This code is provided as an example of how this can be achieved.

# How To Run This Device Connector 

Launch index.js with a single parameter, which is the connection string generated from IoT Hub or IoT Central.  Note that when using IoT Central, you'll need to utilize the dps_cstr utility to generate this connection string.

# How To Configure This Device Connector

In the config.json file, you'll need to provide the IP address, port, and password for your Phidgets Web Server (installed as part of the Phidgets SDK). Refer to the Phidgets documentation at https://www.phidgets.com/docs/Phidget_Network_Server for more info.  You can also set a configuration property to automatically display the temperature and humidity on the local LCD display.

  "phidgetsHostName" : "localhost",
  "phidgetsPort" : 5661,
  "phidgetsPassword" : "",
  "displaySensorValues" : false

In this same file, you specify the interval in milliseconds to specify how frequently telemetry values will be sent to Azure IoT.

  "interval": 60000

You can also specify the interval in milliseconds to control how frequently motion events will be sent to Azure IoT. This implies that events will be sent no more frequently than "X" milliseconds (to avoid noisy signals)

  "motionNotificationDeadband": 60000

# Features

This connector allows you to write to the local LCD display with a device method/command.  You can specify which line # and what text to display.  This connector will also send temperature and humidity telemetry at the user specified interval.
