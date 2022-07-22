---
series: Projects
date: "2020-11-14T08:34:30Z"
thumbnail: aeIOr8w6k.png
usePageBundles: true
tags:
- android
- tasker
- automation
- homeassistant
title: Safeguard your Android's battery with Tasker + Home Assistant
---

A few months ago, I started using the [AccuBattery app](https://play.google.com/store/apps/details?id=com.digibites.accubattery) to keep a closer eye on how I'd been charging my phones. The app has a handy feature that notifies you once the battery level reaches a certain threshold so you can pull the phone off the charger and extend the lithium battery's service life, and it even offers an estimate for what that impact might be. For instance, right now the app indicates that charging my Pixel 5 from 51% to 100% would cause 0.92 wear cycles, while stopping the charge at 80% would impose just 0.17 cycles. 

![AccuBattery screenshot](aeIOr8w6k.png)

But that depends on me being near my phone and conscious so I can take action when the notification goes off. That's often a big assumption to make - and, frankly, I'm lazy. 

I'm fortunately also fairly crafty, so I came up with a way to combine my favorite Android automation app with my chosen home automation platform to take my laziness out of the picture.

### The Ingredients
- [Wemo Mini Smart Plug](https://amzn.to/32G75Nt)
- [Raspberry Pi 3](https://amzn.to/331ZHwb) with [Home Assistant](https://www.home-assistant.io/) installed
- [Tasker](https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm)
- [Home Assistant Plug-In for Tasker](https://play.google.com/store/apps/details?id=com.markadamson.taskerplugin.homeassistant)

I'm not going to go through how to install Home Assistant on the Pi or how to configure it beyond what's strictly necessary for this particular recipe. The official [getting started documentation](https://www.home-assistant.io/getting-started/) is a great place to start. 

### The Recipe
1. Plug the Wemo into a wall outlet, and plug a phone charger into the Wemo. Add the Belkin Wemo integration in Home Assistant, and configure the device and entity. I named mine `switchy`. Make a note of the Entity ID: `switch.switchy`. We'll need that later.
![The new entity in HA](Gu5I3LUep.png)
2. Either point your phone's browser to your [Home Assistant instance's local URL](http://homeassistant.local:8123/), or use the [Home Assistant app](https://play.google.com/store/apps/details?id=io.homeassistant.companion.android) to access it. Tap your username at the bottom of the menu and scroll all the way down to the Long-Lived Access Tokens section. Tap to create a new token. It doesn't matter what you name it, but be sure to copy to token data once it is generated since you won't be able to display it again.
3. Install the [Home Assistant Plug-In for Tasker](https://play.google.com/store/apps/details?id=com.markadamson.taskerplugin.homeassistant). Open Tasker, create a new Task called 'ChargeOff', and set the action to `Plugin > Home Assistant Plug-in for Tasker > Call Service`. Tap the pencil icon to edit the configuration, and then tap the plus sign to add a new server. Give it whatever name you like, and then enter your Home Assistant's IP address for the Base URL, followed by the port number `8123`. For example, `http://192.168.1.99:8123`. Paste in the Long-Lived Access Token you generated earlier. Go on and hit the Test Server button to make sure you got it right. It'll wind up looking something like this:
![Configuring the HA connection in Tasker](8Jg4zgrgB.png)
For the Service field, you need to tell HA what you want it to do. We want it to turn off a switch so enter `switch.turn_off`. We'll use the Service Data field to tell it which switch, in JSON format:
```json
{"entity_id": "switch.switchy"}
```
Tap Test Service to make sure it works - and verify that the switch does indeed turn off. 
![Creating and testing the service](U3LfmEJ_7.png)
4. Hard part is over. Now we just need to set up a profile in Tasker to fire our new task. I named mine 'Charge Limiter'. I started with `State > Power > Battery Level` and set it to trigger between 81-100%., and also added `State > Power > Source: Any` so it will only be active while charging. I also only want this to trigger while my phone is charging at home, so I added `State > Net > Wifi Connected` and then specified my home SSID. Link this profile to the Task you created earlier, and never worry about overcharging your phone again.
![Tasker profile to kill power above 80%](h7tl6facr.png)

You can use a similar Task to turn the switch back on at a set time - or you could configure that automation directly in Home Assistant. I added an action to turn on the switch to my Google Assistant bedtime routine and that works quite well for my needs.
