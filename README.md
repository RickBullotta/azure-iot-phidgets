---
services: iot-hub, iot-central
platforms: Nodejs
author: rickb
---

# Azure IoT Hub/IoT Central Phidgets Interface

This utilizes the Azure IoT Node.js SDK to connect to the a Phidgets 8/8/8 device with display along with a temperature/humidity sensor.  Note that this connector could easily be adapted to work with virtually any Phidgets device(s).  This code is provided as an example of how this can be achieved.

# How To Configure This Device Connector

In a connect.json file, you'll need to provide the idScope, deviceId, and connection key that are displayed when you select "Connect" from the device view inside of IoT Central

{
    "idScope" : "0ne00000000",
    "deviceId" : "MyPhidget",
    "symmetricKey" : "z11uz4E35gO0Z9uI0PYcVm/twUyAm/iJovuMk8A2xpo=",
}

In the connect.json file, you'll also need to provide the IP address, port, and password for your Phidgets Web Server (installed as part of the Phidgets SDK). Refer to the Phidgets documentation at https://www.phidgets.com/docs/Phidget_Network_Server for more info.  

  "phidgetsHostName" : "localhost",
  "phidgetsPort" : 5661,
  "phidgetsPassword" : ""

In the config.json, you specify the interval in milliseconds to specify how frequently telemetry values will be sent to Azure IoT.  You can also set a configuration property to automatically display the temperature and humidity on the local LCD display.

  "interval": 60000,
  "displaySensorValues" : false

You can also specify the interval in milliseconds to control how frequently motion events will be sent to Azure IoT. This implies that events will be sent no more frequently than "X" milliseconds (to avoid noisy signals)

  "motionNotificationDeadband": 60000

# How To Run This Device Connector 

Launch index.js to execute this connector.

# Features

This connector allows you to write to the local LCD display with a device method/command.  You can specify which line # and what text to display.  

It will also send temperature, humidity, and ambient light telemetry at the user specified interval.

Lastly, it will fire a motion detection event.  

This is a very specific example, but Phidgets are very flexible and have lots of devices and sensors that can be similarly connected and integrated.
