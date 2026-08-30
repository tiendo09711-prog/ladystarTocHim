<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\PermissionRegistry;
use App\Support\PhoneNormalizer;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'phone', 'password', 'role', 'status'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public function setPhoneAttribute(?string $value): void
    {
        $this->attributes['phone'] = PhoneNormalizer::normalize($value);
    }

    public function addresses()
    {
        return $this->hasMany(Address::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function returnRequests()
    {
        return $this->hasMany(ReturnRequest::class);
    }

    public function warrantyRequests()
    {
        return $this->hasMany(WarrantyRequest::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function cart()
    {
        return $this->hasOne(Cart::class);
    }

    public function wishlistEntries()
    {
        return $this->hasMany(Wishlist::class);
    }

    public function customerTags()
    {
        return $this->belongsToMany(CustomerTag::class, 'customer_tag_user')->withTimestamps();
    }

    public function customerNotes()
    {
        return $this->hasMany(CustomerNote::class, 'customer_id');
    }

    public function staffRoles()
    {
        return $this->belongsToMany(StaffRole::class, 'staff_role_user')->withTimestamps();
    }

    public function isCustomer(): bool
    {
        return $this->role === 'user';
    }

    public function isStaff(): bool
    {
        return $this->role === 'staff';
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function canAccessAdmin(): bool
    {
        return $this->status === 'active' && ($this->isSuperAdmin() || $this->isStaff());
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->isStaff() && in_array($permission, $this->effectivePermissionKeys(), true);
    }

    public function effectivePermissionKeys(): array
    {
        if ($this->isSuperAdmin()) {
            return PermissionRegistry::keys();
        }

        if (! $this->isStaff()) {
            return [];
        }

        return $this->staffRoles()
            ->with('permissions:id,key')
            ->get()
            ->flatMap(fn (StaffRole $role) => $role->permissions->pluck('key'))
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    public function isAdmin(): bool
    {
        return $this->isSuperAdmin();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
