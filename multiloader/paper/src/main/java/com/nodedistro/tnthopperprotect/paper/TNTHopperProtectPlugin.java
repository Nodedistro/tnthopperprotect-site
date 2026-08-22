package com.nodedistro.tnthopperprotect.paper;

import org.bukkit.damage.DamageSource;
import org.bukkit.entity.minecart.HopperMinecart;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.vehicle.VehicleDamageEvent;
import org.bukkit.event.vehicle.VehicleDestroyEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.tag.DamageTypeTags;

import java.util.List;

public final class TNTHopperProtectPlugin extends JavaPlugin implements Listener {
    @Override
    public void onEnable() {
        saveDefaultConfig();
        getServer().getPluginManager().registerEvents(this, this);
        getLogger().info("TNT Hopper Protect 2.0.0 enabled.");
    }

    private boolean shouldProtect(HopperMinecart minecart) {
        if (!getConfig().getBoolean("protect-hopper-minecarts", true)) return false;
        List<String> worlds = getConfig().getStringList("enabled-worlds");
        return worlds.isEmpty() || worlds.contains(minecart.getWorld().getName());
    }

    private boolean isExplosion(DamageSource source) {
        return DamageTypeTags.IS_EXPLOSION.isTagged(source.getDamageType());
    }

    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onVehicleDamage(VehicleDamageEvent event) {
        if (event.getVehicle() instanceof HopperMinecart cart && shouldProtect(cart) && isExplosion(event.getDamageSource())) {
            event.setCancelled(true);
            event.setDamage(0.0);
        }
    }

    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onVehicleDestroy(VehicleDestroyEvent event) {
        if (event.getVehicle() instanceof HopperMinecart cart && shouldProtect(cart) && isExplosion(event.getDamageSource())) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onEntityDamage(EntityDamageEvent event) {
        if (event.getEntity() instanceof HopperMinecart cart && shouldProtect(cart) && isExplosion(event.getDamageSource())) event.setCancelled(true);
    }
}
