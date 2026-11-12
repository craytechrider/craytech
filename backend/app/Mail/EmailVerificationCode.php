<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EmailVerificationCode extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $code,
        public string $customerName
    ) {}

    public function build()
    {
        return $this->subject('Verify Your CRAYTECH Account')
            ->view('emails.verification-code');
    }
}
