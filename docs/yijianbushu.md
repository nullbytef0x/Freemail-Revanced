## One-Click Deployment Guide

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/nullbytef0x/Freemail-Revanced)

#### 1. Click Deploy to Cloudflare

#### 2. After signing in, choose your region (Asia is recommended, but optional)
Do not change the D1 database name or R2 bucket name, or queries may fail.

![Deployment Step 1](../pic/v4/depl1.png)

#### 3. Click Create and Deploy, then wait for the clone/deploy process
![Deployment Step 2](../pic/v4/depl2.png)

#### 4. Continue project setup and bind the required environment variables
![Deployment Variables 1](../pic/v4/depl.png)

![Deployment Variables 2](../pic/v4/depl5.png)

#### 5. After adding variables, click Deploy

Note: These three variables are required. Other variables (such as admin name and sending API key) are optional.

After deployment, open the Worker URL and sign in.

![Deployment Complete](../pic/v4/depl5.jpeg)

#### 6. The default admin username is admin

#### 7. Bind your domain email catch-all rule to this Worker
If you do not bind catch-all, incoming emails will not be received.

![Catch-all Binding](../pic/v4/depl6.png)
