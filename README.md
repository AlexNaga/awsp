# awsp

A script to switch between your AWS accounts.

### How to run?

#### 1. Install dependencies

```sh
npm i
```

#### 2. Update environment variables

After install, change the example values in the file `.env`

#### 3. Run script.

```sh
npm run start <aws_profile_name>
```

### How to install globally?

By linking it globally, it's possible to run command `awsp <aws_profile_name>` in the terminal.

```sh
npm link
```

### How to remove globally?

```sh
npm unlink
```
