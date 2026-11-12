<x-guest-layout>
    <style>
        body {
            margin: 0;
            font-family: "Segoe UI", sans-serif;
            background: linear-gradient(rgba(10, 31, 68, 0.6), rgba(46, 79, 133, 0.6)),
            url("{{ asset('images/background.jpg') }}") no-repeat center center fixed;
            background-size: cover;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        .register-container {
            width: 100%;
            max-width: 420px;
        }

        .register-card {
            background: rgba(70, 130, 180, 0.85);
            /* steelblue with transparency */
            padding: 35px;
            border-radius: 14px;
            text-align: center;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        }

        .brand {
            font-size: 30px;
            font-weight: bold;
            color: #e74c3c;
            margin-bottom: 24px;
            letter-spacing: 2px;
        }

        .field {
            text-align: left;
            margin-bottom: 18px;
        }

        .field label {
            font-size: 14px;
            color: #f0f4fa;
            margin-bottom: 6px;
            display: block;
        }

        .field input {
            width: 100%;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #2c3e50;
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
        }

        .btn-register {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 8px;
            background: #e74c3c;
            color: #fff;
            font-weight: bold;
            cursor: pointer;
            margin-top: 12px;
            transition: background 0.3s ease;
        }

        .btn-register:hover {
            background: #ff5c4c;
        }

        .link-login {
            display: block;
            margin-top: 16px;
            font-size: 14px;
            color: #f0f4fa;
        }

        .link-login:hover {
            text-decoration: underline;
            color: #fff;
        }
    </style>

    <div class="register-container">
        <div class="register-card">
            <!-- Logo -->
            <div class="w-32 h-32 flex items-center justify-center bg-white rounded-lg shadow-lg relative mx-auto mb-4">
                <img src="{{ asset('images/logo.png') }}" alt="CRAYTECH Logo" class="w-24 h-auto">
                <div class="absolute inset-0 bg-white opacity-20"
                    style="clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);"></div>
            </div>
            <h1 class="brand">CRAYTECH</h1>

            <!-- Register Form -->
            <form method="POST" action="{{ route('register') }}">
                @csrf

                <!-- Name -->
                <div class="field">
                    <label for="name">Name</label>
                    <input id="name" type="text" name="name" value="{{ old('name') }}" required autofocus>
                    <x-input-error :messages="$errors->get('name')" class="mt-2" />
                </div>

                <!-- Email -->
                <div class="field">
                    <label for="email">Email address</label>
                    <input id="email" type="email" name="email" value="{{ old('email') }}" required>
                    <x-input-error :messages="$errors->get('email')" class="mt-2" />
                </div>

                <!-- Password -->
                <div class="field">
                    <label for="password">Password</label>
                    <input id="password" type="password" name="password" required>
                    <x-input-error :messages="$errors->get('password')" class="mt-2" />
                </div>

                <!-- Confirm Password -->
                <div class="field">
                    <label for="password_confirmation">Confirm Password</label>
                    <input id="password_confirmation" type="password" name="password_confirmation" required>
                    <x-input-error :messages="$errors->get('password_confirmation')" class="mt-2" />
                </div>

                <!-- Register Button -->
                <button type="submit" class="btn-register">SIGN UP</button>
            </form>

            <!-- Link to Login -->
            <a href="{{ route('login') }}" class="link-login">Already registered? Log in</a>
        </div>
    </div>
</x-guest-layout>