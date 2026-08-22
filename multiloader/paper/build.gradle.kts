plugins { java }

group = "com.nodedistro"
version = "2.0.0"

repositories {
    mavenCentral()
    maven { name = "papermc"; url = uri("https://repo.papermc.io/repository/maven-public/") }
}

dependencies { compileOnly("io.papermc.paper:paper-api:26.1.2-R0.1-SNAPSHOT") }

java { toolchain.languageVersion.set(JavaLanguageVersion.of(25)) }

tasks.jar { archiveBaseName.set("TNT-Hopper-Protect-Paper") }
