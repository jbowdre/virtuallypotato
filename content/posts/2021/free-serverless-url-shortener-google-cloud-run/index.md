---
series: Projects
date: "2021-08-20T00:00:00Z"
lastmod: 2022-02-03
usePageBundles: true
tags:
- gcp
- cloud
- serverless
title: Free serverless URL shortener on Google Cloud Run
---
### Intro
I've been [using short.io with a custom domain](https://twitter.com/johndotbowdre/status/1370125198196887556) to keep track of and share messy links for a few months now. That approach has worked very well, but it's also seriously overkill for my needs. I don't need (nor want) tracking metrics to know anything about when those links get clicked, and short.io doesn't provide an easy way to turn that off. I was casually looking for a lighter self-hosted alternative today when I stumbled upon a *serverless* alternative: **[sheets-url-shortener](https://github.com/ahmetb/sheets-url-shortener)**. This uses [Google Cloud Run](https://cloud.google.com/run/) to run an ultralight application container which receives an incoming web request, looks for the path in a Google Sheet, and redirects the client to the appropriate URL. It supports connecting with a custom domain, and should run happily within the [Cloud Run Free Tier limits](https://cloud.google.com/run/pricing).

The Github instructions were pretty straight-forward but I did have to fumble through a few additional steps to get everything up and running. Here we go:

### Shortcut mapping
Since the setup uses a simple Google Sheets document to map the shortcuts to the original long-form URLs, I started by going to [https://sheets.new](https://sheets.new) to create a new Sheet. I then just copied in the shortcuts and URLs I was already using in short.io. By the way, I learned on a previous attempt that this solution only works with lowercase shortcuts so I made sure to convert my `MixedCase` ones as I went.
![Creating a new sheet](20210820_sheet.png)

I then made a note of the Sheet ID from the URL; that's the bit that looks like `1SMeoyesCaGHRlYdGj9VyqD-qhXtab1jrcgHZ0irvNDs`. That will be needed later on.

### Create a new GCP project
I created a new project in my GCP account by going to [https://console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate) and entering a descriptive name.
![Creating a new GCP project](20210820_create_project.png)

### Deploy to GCP
At this point, I was ready to actually kick off the deployment. Ahmet made this part exceptionally easy: just hit the **Run on Google Cloud** button from the [Github project page](https://github.com/ahmetb/sheets-url-shortener#setup). That opens up a Google Cloud Shell instance which prompts for authorization before it starts the deployment script.
![Open in Cloud Shell prompt](20210820_open_in_cloud_shell.png)

![Authorize Cloud Shell prompt](20210820_authorize_cloud_shell.png)

The script prompted me to select a project and a region, and then asked for the Sheet ID that I copied earlier. 
![Cloud Shell deployment](20210820_cloud_shell.png)

### Grant access to the Sheet
In order for the Cloud Run service to be able to see the URL mappings in the Sheet I needed to share the Sheet with the service account. That service account is found by going to [https://console.cloud.google.com/run](https://console.cloud.google.com/run), clicking on the new `sheets-url-shortener` service, and then viewing the **Permissions** tab. I'm interested in the one that's `############-computer@developer.gserviceaccount.com`.
![Finding the service account](20210820_service_account.png)

I then went back to the Sheet, hit the big **Share** button at the top, and shared the Sheet to the service account with *Viewer* access.
![Sharing to the service account](20210820_share_with_svc_account.png)

### Quick test
Back in GCP land, the details page for the `sheets-url-shortener` Cloud Run service shows a gross-looking URL near the top: `https://sheets-url-shortener-vrw7x6wdzq-uc.a.run.app`. That doesn't do much for *shortening* my links, but it'll do just fine for a quick test. First, I pointed my browser straight to that listed URL:
![Testing the web server](20210820_home_page.png)

This at least tells me that the web server portion is working. Now to see if I can redirect to my [project car posts on Polywork](https://john.bowdre.net/?badges%5B%5D=Car+Nerd):
![Testing a redirect](20210820_sheets_api_disabled.png)

Hmm, not quite. Luckily the error tells me exactly what I need to do...

### Enable Sheets API
I just needed to visit `https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=############` to enable the Google Sheets API.
![Enabling Sheets API](20210820_enable_sheets_api.png)

Once that's done, I can try my redirect again - and, after a brief moment, it successfully sends me on to Polywork!
![Successful redirect](20210820_successful_redirect.png)

### Link custom domain
The whole point of this project is to *shorten* URLs, but I haven't done that yet. I'll want to link in my `go.bowdre.net` domain to use that in place of the rather unwieldy `https://sheets-url-shortener-vrw7x6wdzq-uc.a.run.app`. I do that by going back to the [Cloud Run console](https://console.cloud.google.com/run) and selecting the option at the top to **Manage Custom Domains**.
![Manage custom domains](20210820_manage_custom_domain.png)

I can then use the **Add Mapping** button, select my `sheets-url-shortener` service, choose one of my verified domains (which I *think* are already verified since they're registered through Google Domains with the same account), and then specify the desired subdomain.
![Adding a domain mapping](20210820_add_mapping_1.png)

The wizard then tells me exactly what record I need to create/update with my domain host:
![CNAME details](20210820_add_mapping_2.png)

It took a while for the domain mapping to go live once I've updated the record.
![Processing mapping...](20210820_domain_mapping.png)

### Final tests
Once it did finally update, I was able to hit `https://go.bowdre.net` to get the error/landing page, complete with a valid SSL cert:
![Successful error!](20210820_landing_page.png)

And testing [go.bowdre.net/ghia](https://go.bowdre.net/ghia) works as well!

### Outro
I'm very pleased with how this quick little project turned out. Managing my shortened links with a Google Sheet is quite convenient, and I really like the complete lack of tracking or analytics. Plus I'm a sucker for an excuse to use a cloud technology I haven't played a lot with yet.

And now I can hand out handy-dandy short links!

| Link | Description|
| --- | --- |
| [go.bowdre.net/ghia](https://go.bowdre.net/ghia) | 1974 VW Karmann Ghia project |
| [go.bowdre.net/conedoge](https://go.bowdre.net/conedoge) | 2014 Subaru BRZ autocross videos |
| [go.bowdre.net/matrix](https://go.bowdre.net/matrix) | Chat with me on Matrix |
| [go.bowdre.net/twits](https://go.bowdre.net/twits) | Follow me on Twitter |
| [go.bowdre.net/stadia](https://go.bowdre.net/stadia) | Game with me on Stadia |
| [go.bowdre.net/shorterer](https://go.bowdre.net/shorterer) | This post! |

