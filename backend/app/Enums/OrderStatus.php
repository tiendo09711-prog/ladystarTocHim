<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Processing = 'processing';
    case Shipping = 'shipping';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
