#!/bin/sh

ifconfig | grep 192
ifconfig | grep 172

export NODE_ENV=production
export PORT=8081

supervisor -w server.js server
