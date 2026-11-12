<x-guest-layout>
    <style>
        body {
            margin: 0;
            font-family: "Segoe UI", sans-serif;
            /* Blueish gradient overlay on background image */
            background: linear-gradient(rgba(10, 31, 68, 0.6), rgba(46, 79, 133, 0.6)),
            url("{{ asset('images/background.jpg') }}") no-repeat center center fixed;
            background-size: cover;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        .login-container {
            width: 100%;
            max-width: 400px;
        }

        .login-card {
            /* Lighter blue background */
            background: rgba(70, 130, 180, 0.85);
            /* steelblue with transparency */
            padding: 35px;
            border-radius: 14px;
            text-align: center;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        }

        .logo img {
            width: 90px;
            margin-bottom: 12px;
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

        .btn-login {
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

        .btn-login:hover {
            background: #ff5c4c;
        }

        .divider {
            margin: 22px 0;
            color: #cbd4e2;
            font-size: 13px;
            position: relative;
        }

        .divider::before,
        .divider::after {
            content: "";
            position: absolute;
            top: 50%;
            width: 40%;
            height: 1px;
            background: #cbd4e2;
        }

        .divider::before {
            left: 0;
        }

        .divider::after {
            right: 0;
        }

        .btn-google {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 50px;
            background: #fff;
            color: #333;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            transition: box-shadow 0.3s ease;
        }

        .btn-google:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .g-icon {
            background: #e74c3c;
            color: #fff;
            border-radius: 50%;
            width: 26px;
            height: 26px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 10px;
            font-weight: bold;
        }
    </style>

    <div class="login-container">
        <div class="login-card">
            <!-- Logo -->
            <div class="logo flex justify-center mb-4">
                <div class="w-32 h-32 flex items-center justify-center bg-white rounded-lg shadow-lg relative">
                    <img src="{{ asset('images/logo.png') }}" alt="CRAYTECH Logo" class="w-24 h-auto">
                    <div class="absolute inset-0 bg-white opacity-20"
                        style="clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);"></div>
                </div>
            </div>
            <h1 class="brand">CRAYTECH</h1>

            <!-- Login Form -->
            <form method="POST" action="{{ route('login') }}">
                @csrf

                <!-- Email -->
                <div class="field">
                    <label for="email">Email address</label>
                    <input id="email" type="email" name="email" value="{{ old('email') }}" required autofocus>
                    <x-input-error :messages="$errors->get('email')" class="mt-2" />
                </div>

                <!-- Password -->
                <div class="field">
                    <label for="password">Password</label>
                    <input id="password" type="password" name="password" required>
                    <x-input-error :messages="$errors->get('password')" class="mt-2" />
                </div>

                <!-- Login Button -->
                <button type="submit" class="btn-login">LOG IN</button>
            </form>

            <div class="divider">OR</div>

            <!-- Google Login -->
            <a href="{{ url('auth/google') }}" class="btn-google">
                <span class="g-icon">G</span> Sign in with Google
            </a>
        </div>
    </div>
</x-guest-layout>