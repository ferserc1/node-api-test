#include "actualclass.h"

ActualClass::ActualClass(double value)
{
    _value = value;
}

double ActualClass::getValue()
{
    return _value;
}

double ActualClass::add(double value)
{
    _value += value;
    return _value;
}

