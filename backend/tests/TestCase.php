<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function seed($class = 'Database\\Seeders\\DemoDataSeeder')
    {
        return parent::seed($class);
    }
}
