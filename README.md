# awsp

A script to switch between your AWS profiles.

### How to install?

#### 1. Clone this repo

```sh
git clone git@github.com:AlexNaga/awsp.git
```

#### 2. Install dependencies

```sh
npm i
```

#### 3. Update environment variables

After install, change the example values in the file `.env`

The _SECRET_MFA_KEY_ is generated from https://mysignins.microsoft.com/security-info

#### 4. Install globally

By linking it globally, it's possible to run command `awsp` in the terminal.

```sh
npm link
```

### How to remove globally?

```sh
npm unlink
```
