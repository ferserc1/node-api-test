# node-api-test
Un ejemplo de node-api para crear paquetes nativos en C++ para node.

## Referencias

[Documentación oficial](https://nodejs.org/api/n-api.html)
[hello world](https://nodejs.org/api/addons.html#hello-world)
[beginners guide to writting NodeJS addons using n-api](https://blog.atulr.com/node-addon-guide/)

## Para qué sirve n-api

N-API es un API para construir addons nativos para node. Puedes querer construir addons nativos de node por varios motivos: para acceder a APIs que solo están disponibles en C/C++, para integrar bibliotecas de terceros, por motivos de rendimiento...

En cualquier caso, N-API tiene una serie de características que lo hacen muy interesante:

- Es independiente del runtime de javascript, por lo que si en un futuro Node cambiara del motor V8 a otra implementación, los addons seguirían siendo compatibles.
- El API (Application Binary Interface) es estable entre distintas versiones de Node, de manera que podemos utilizar nuestro addon en una u otra versión de NodeJS sin tener que recompilarlo.
- Es estable a partir de la versión 10 de NodeJS

Por lo tanto, crear y mantener un addon nativo no debe suponer grandes dolores de cabeza, al margen del propio conocimiento del lenguaje C++ y de la necesidad de mantener código binario precompilado.

## Preparar el proyecto

Primero inicializaremos el fichero `package.json`, o bien manualmente, o bien mediante `npm init`. Instalaremos dos dependencias, una para desarrollo y otra para ejecución:

```sh
npm install node-gyp --save-dev
npm install node-addon-api --save
```

- node-gyp es la herramienta de compilación oficial para compilar código nativo en paquetes de node.
- node-addon-api es un proyecto que contiene cabeceras de C++ para simplificar el desarrollo de addons, así que esta dependencia es opcional, pero el código de este ejemplo la utiliza.

En cuanto a `.gitignore`, tenemos que añadir:

Añadir a .gitignore:

```other
node_modules
*.log
build/*
```


## Configurar entorno de building

Es necesario añadir el atributo `gypfile:true` al fichero `package.json` y crear el fichero de build `binding.gyp` (es el equivalente a un `Makefile` o a un `CMake.txt`) para que podamos compilar código C++ nativo:


**package.json**

```json
{
    ...
    "gypfile": true,
    ...
}
```

**binding.gyp**

```json
{
    "targets": [{
        "target_name": "testaddon",
        "cflags!": [ "-fno-exceptions" ],
        "cflags_cc!": [ "-fno-exceptions" ],
        "sources": [
            "cppsrc/main.cpp"
        ],
        "include_dirs": [
            "<!@(node -p \"require('node-addon-api').include\")"
        ],
        "libraries": [],
        "dependencies": [
            "<!(node -p \"require('node-addon-api').gyp\")"
        ],
        "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
    }]
}
```

Además de esto, configuraremos los scripts del `package.json`. Es posible evitar este paso, pero entonces tendríamos que instalar `node-gyp` en el sistema. De esta forma basta con tenerlo configurado en el `package.json` como dependencia de desarrollo.

**package.json**

```json
{
    ...
    "scripts": {
        "build": "node-gyp rebuild",
        "clean": "node-gyp clean"
    },
    ...
}
```


## Añadir fichero C++

Del contenido del fichero `binding.gyp` se puede deducir que nuestro fichero de código fuente estará ubicado en `cppsrc/main.cpp`:

**cppsrc/main.cpp**

```c++
#include <napi.h>

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return exports;
}

NODE_API_MODULE(testaddon, InitAll)
```

También añadiremos un fichero `index.js` para conectar con el código nativo del módulo:

**index.js**

```js
const testAddon = require('./build/Release/testaddon.node');

module.exports = testAddon;
```

## Explicación

El fichero `napi.h` incluye los archivos de cabecera que vamos a necesitar para tener acceso a las macros de soporte, clases y funciones. La macro `NODE_API_MODULE` sirve para registrar el módulo con la función de inicio, que en nuestro caso es `InitAll`

## Hello World desde C++

Vamos a añadir un fichero que exporte una función desde C++, que simplemente va a devolver un string.

**cppsrc/Samples/functionalexample.h**

```c++
namespace functionalexample {
    std::string hello();
    Napi::String HelloWrapped(const Napi::CallbackInfo& info);
    Napi::Object Init(Napi::Env env, Napi::Object exports);
}
```

La implementación del código anterior es la siguiente:

**cppsrc/Samples/functionalexample.cpp**

```c++
#include "functionalexample.h"

namespace functionalexample {

    std::string hello() {
        return "Hello World";
    }

    Napi::String HelloWrapped(const Napi::CallbackInfo& info)
    {
        Napi::Env env = info.Env();
        Napi::String returnValue = Napi::String::New(env, functionalexample::hello());
        return returnValue;
    }

    Napi::Object Init(Napi::Env env, Napi::Object exports)
    {
        exports.Set(
            "hello", Napi::Function::New(env, functionalexample::HelloWrapped)
        );

        return exports;
    }

}
```

El fichero principal de nuestro módulo, donde hemos usado la macro `NODE_API_MODULE`, es `cppsrc/main.cpp`, así que ahí está el punto de entrada de nuestro módulo. Vamos a añadir la llamada a `functionalexample::Init()` en ese fichero, para exportar la nueva función:

```c++
#include <napi.h>
#include "Samples/functionalexample.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return functionalexample::Init(env, exports);
}

NODE_API_MODULE(testaddon, InitAll)
```

Por último, tenemos que informar a `node-gyp` de que hemos añadido un fichero más para compilar, así que lo añadimos en la sección `sources`:

**binding.gyp:**

```json
{
    ...
    "sources": [
        "cppsrc/main.cpp",
        "cppsrc/Samples/functionalexample.cpp"
    ],
    ,,,
}
```

Con esto ya podemos recompilar el módulo (evidentemente, cada cambio que se haga en C++ requiere una recompilación del módulo):

```sh
npm run build
```

Una vez recompilado el módulo, podemos hacer uso de la función que hemos exportado en el módulo desde C++:

**index.js:**

```js
const testAddon = require('./build/Release/testaddon.node');
console.log(testAddon.hello());
module.exports = testAddon;
```

## Paso de parámetros

Vamos a añadir una función que reciba dos parámetros (solo se muestra el fichero c++, recuerda añadir las definiciones al fichero .h)

**cppsrc/Samples/functionalexample.cpp:**

```c++
...
namespace functionalexample {
    ...

    int add(int a, int b)
    {
        return a + b;
    }

   ...

    Napi::Number AddWrapped(const Napi::CallbackInfo& info)
    {
        Napi::Env env = info.Env();
        if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
            Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
        }

        Napi::Number first = info[0].As<Napi::Number>();
        Napi::Number second = info[1].As<Napi::Number>();

        int returnValue = functionalexample::add(first.Int32Value(), second.Int32Value());

        return Napi::Number::New(env, returnValue);
    }

    Napi::Object Init(Napi::Env env, Napi::Object exports)
    {
        exports.Set(
            "hello", Napi::Function::New(env, functionalexample::HelloWrapped)
        );

        exports.Set(
            "add", Napi::Function::New(env, functionalexample::AddWrapped)
        );

        return exports;
    } 
}
```

Una vez recompilado el proyecto, podemos usamos la nueva función desde JavaScript:

```js
const testAddon = require('./build/Release/testaddon.node');
console.log(testAddon.hello());
console.log(testAddon.add(12,15));
module.exports = testAddon;
```

## Exportando clases

Ver código fuente:

- actualclass.h y actualclass.cpp: definen una clase en C++ que queremos exportar a node
- classexample.h y classexample.ccp: son el wrapper para la clase que vamos a exportar. Es una clase que extiende `Napi::ObjectWrap<T>`, el tipo de plantilla T en nuestro caso sería `ClassExample`, que es la propia clase wrapper que estamos definiendo.

Se han añadido también esos ficheros cpp al archov `binding.gyp`.

Las partes más relevantes del código son:

**Definición de la clase, en classexample.cpp:**

```c++
Napi::Object ClassExample::Init(Napi::Env env, Napi::Object exports)
{
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "ClassExample", 
    {
        InstanceMethod("add", &ClassExample::Add),
        InstanceMethod("getValue", &ClassExample::GetValue)
    });
    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("ClassExample", func);
    return exports;
}
```

En la definición de la clase, que realizamos creando un método estático de clase (el nombre del método es indiferente, ya que luego lo invocaremos desde `main.cpp`) usamos la función `DefineClass` para definir los métodos que van a ser públicos de la clase.

La variable estática `constructor` contiene la definición de la clase. Se crea en el método `Init` y se llama a la función `SuppressDestruct()` porque no queremos que se destruya.

El resto del código es similar al que hemos creado en el caso de funciones: el wrapper básicamente se encarga de realizar la conversión de tipos, a excepción del constructor de la clase, que también se encarga de crear la instancia de la clase de C++:

```c++
_actualClass = new ActualClass(value.DoubleValue());
```

## Pasar objetos complejos a C++

En este caso, nos referimos a pasar una instancia de una clase definida en C++, a la parte nativa. Para ver este ejemplo, vamos a hacer que el constructor de nuestro wrapper acepte dos tipos de datos: o bien un número, para funcionar como hasta ahora, o bien una instancia de ClassExample, para inicializar la nueva clase con el valor de la instancia:

**index.js:**

```js
...
const classInstance = new testAddon.ClassExample(4.3);
const valueToAdd = 3;
console.log(`Testing classInstance value: ${ classInstance.getValue() }`);
console.log(`After adding ${ valueToAdd }: ${ classInstance.add(valueToAdd) }`);

// Crear una instancia a partir de otra
const newFromExisting = new testAddon.ClassExample(classInstance);
console.log("Testing class initial value for derived instance");
console.log(newFromExisting.getValue());
...

```

**cppsrc/Samples/classexample.cpp:**

```c++
...
ClassExample::ClassExample(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<ClassExample>(info)
{
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);

    if (info.Length() != 1) {
        Napi::TypeError::New(env, "Se esperaba exactamente un argumento").ThrowAsJavaScriptException();
    }

    if (!info[0].IsNumber()) {
        Napi::Object object_parent = info[0].As<Napi::Object>();
        ClassExample* example_parent = Napi::ObjectWrap<ClassExample>::Unwrap(object_parent);
        ActualClass* parent_actual_class_instance = example_parent->GetInternalInstance();
        _actualClass = new ActualClass(parent_actual_class_instance->getValue());
    }
    else if (info[0].IsNumber()) {
        Napi::Number value = info[0].As<Napi::Number>();
        _actualClass = new ActualClass(value.DoubleValue());
    }
    else {
        Napi::TypeError::New(env, "Se esperaba un número o una instancia de ClassExample").ThrowAsJavaScriptException();
    }
}

// También añadimos un accessor para obtener la instancia de ActualClass
ActualClass* ClassExample::GetInternalInstance()
{
    return _actualClass;
}
...
```

NOTA: recuerda definir `GetInternalInstance` en la cabecera de `ClassExample`


