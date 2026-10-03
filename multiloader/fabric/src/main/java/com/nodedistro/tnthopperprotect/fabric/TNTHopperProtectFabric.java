package com.nodedistro.tnthopperprotect.fabric;

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class TNTHopperProtectFabric implements ModInitializer {
    public static final String MOD_ID = "tnthopperprotect";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    @Override
    public void onInitialize() {
        LOGGER.info("TNT Hopper Protect Fabric 4.0.0 loaded.");
    }
}
